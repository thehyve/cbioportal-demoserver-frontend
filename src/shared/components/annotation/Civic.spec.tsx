import Civic from './Civic';
import React from 'react';
import { assert } from 'chai';
import {shallow, mount, ReactWrapper} from 'enzyme';
import sinon from 'sinon';
import {lazyMobXTableSort} from "../lazyMobXTable/LazyMobXTable";
import {IndicatorQueryResp} from "../../api/generated/OncoKbAPI";

describe('Civic', () => {
    const props = {
        civicEntry: undefined,
        hasCivicVariants: true
    };

    let component: ReactWrapper<any, any>;

    before(() => {
        component = mount(<Civic {...props}/>);
    });

    it('displays a load spinner when there is no civic data', () => {
        const spinner = component.find("Circle");

        assert.isTrue(spinner.exists(),
            "Spinner component should exist");

        assert.equal(spinner.prop("size"), 18,
            "Spinner size should be equal to 18");

        assert.equal(spinner.prop("color"), "#aaa",
            "Spinner color should be #aaa");
    });

    after(() => {

    });
});
