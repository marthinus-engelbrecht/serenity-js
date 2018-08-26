import { expect, ifExitCodeIsOtherThan, logOutput } from '@integration/testing-tools';
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

import { cucumber, Pick } from '../src';

describe('@serenity-js/cucumber', function() {

    this.timeout(5000);

    given([
        'promise',
        'callback',
    ]).
    it('recognises a timed out scenario', (stepInterface: string) =>
        cucumber(
            '--require', 'features/support/configure_serenity.ts',
            '--require', `features/step_definitions/${ stepInterface }.steps.ts`,
            '--require', 'node_modules/@serenity-js/cucumber/register.js',
            'features/timed_out_scenario.feature',
        ).
        then(ifExitCodeIsOtherThan(1, logOutput)).
        then(res => {
            expect(res.exitCode).to.equal(1);

            Pick.from(res.events)
                .next(SceneStarts,         event => expect(event.value.name).to.equal(new Name('A timed out scenario')))
                .next(TestRunnerDetected,  event => expect(event.value).to.equal(new Name('Cucumber')))
                .next(SceneTagged,         event => expect(event.tag).to.equal(new FeatureTag('Serenity/JS recognises a timed out scenario')))
                .next(ActivityStarts,      event => expect(event.value.name).to.equal(new Name('Given a step that times out')))
                .next(ActivityFinished,    event => {
                    expect(event.outcome).to.be.instanceOf(ExecutionFailedWithError);
                    expect((event.outcome as ExecutionFailedWithError).error.message).to.equal('function timed out after 100 milliseconds');
                })
                .next(SceneFinished,       event => {
                    expect(event.outcome).to.be.instanceOf(ExecutionFailedWithError);
                    expect((event.outcome as ExecutionFailedWithError).error.message).to.equal('function timed out after 100 milliseconds');
                })
            ;
        }));
});
