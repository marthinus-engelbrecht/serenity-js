import { expect, ifExitCodeIsOtherThan, logOutput, Pick } from '@integration/testing-tools';
import {
    ActivityFinished,
    ActivityStarts,
    SceneFinished,
    SceneStarts,
    SceneTagged,
    TestRunnerDetected,
} from '@serenity-js/core/lib/events';
import { ExecutionFailedWithError, FeatureTag, Name } from '@serenity-js/core/lib/model';

import 'mocha';
import { given } from 'mocha-testdata';
import { CucumberRunner, cucumberVersions } from '../src';

describe('@serenity-js/cucumber', function() {

    this.timeout(5000);

    given([
        ...cucumberVersions(1, 2)
            .thatRequires(
                'node_modules/@serenity-js/cucumber/lib/register.js',
                'lib/support/configure_serenity.js',
            )
            .withStepDefsIn('ambiguous')
            .toRun('features/passing_scenario.feature'),

        ...cucumberVersions(3)
            .thatRequires('lib/support/configure_serenity.js')
            .withStepDefsIn('ambiguous')
            .withArgs(
                '--format', 'node_modules/@serenity-js/cucumber',
            )
            .toRun('features/passing_scenario.feature'),
    ]).
    it('recognises scenarios with ambiguous steps', (runner: CucumberRunner) => runner.run().
        then(ifExitCodeIsOtherThan(1, logOutput)).
        then(res => {
            expect(res.exitCode).to.equal(1);

            Pick.from(res.events)
                .next(SceneStarts,         event => expect(event.value.name).to.equal(new Name('A passing scenario')))
                .next(TestRunnerDetected,  event => expect(event.value).to.equal(new Name('Cucumber')))
                .next(SceneTagged,         event => expect(event.tag).to.equal(new FeatureTag('Serenity/JS recognises a passing scenario')))
                .next(ActivityStarts,      event => expect(event.value.name).to.equal(new Name('Given a step that passes')))
                .next(ActivityFinished,    event => {
                    expect(event.outcome).to.be.instanceOf(ExecutionFailedWithError);

                    const err = (event.outcome as ExecutionFailedWithError).error;

                    const lines = err.message.split('\n');

                    expect(lines[0]).to.equal('Multiple step definitions match:');
                    expect(lines[1]).to.contain('/^.*step (?:.*) passes$/');
                    expect(lines[1]).to.contain('ambiguous.steps.js');
                    expect(lines[2]).to.contain('/^.*step (?:.*) passes$/');
                    expect(lines[2]).to.contain('ambiguous.steps.js');
                })
                .next(SceneFinished,       event => {
                    expect(event.outcome).to.be.instanceOf(ExecutionFailedWithError);

                    const err = (event.outcome as ExecutionFailedWithError).error;

                    expect(err.message).to.match(/^Multiple step definitions match/);
                })
            ;
        }));
});
