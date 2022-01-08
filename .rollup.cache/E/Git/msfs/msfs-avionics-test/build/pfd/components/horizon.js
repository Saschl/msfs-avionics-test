import { Arinc429Word } from '../shared/arinc429';
import { calculateHorizonOffsetFromPitch, calculateVerticalOffsetFromRoll, LagFilter, } from './PFDUtils';
import { DisplayComponent, FSComponent, Subject } from 'msfssdk';
const DisplayRange = 35;
const DistanceSpacing = 15;
const ValueSpacing = 10;
class TickFunction extends DisplayComponent {
    render() {
        return (FSComponent.buildComponent("path", { transform: `translate(${this.props.offset} 0)`, className: "NormalStroke White", d: "m68.906 80.823v1.8" }));
    }
}
export class HeadingBug extends DisplayComponent {
    render() {
        return (FSComponent.buildComponent("g", { id: "HorizonHeadingBug", transform: `translate(${this.props.offset} 0)` },
            FSComponent.buildComponent("path", { className: "ThickOutline", d: "m68.906 80.823v-9.0213" }),
            FSComponent.buildComponent("path", { className: "ThickStroke Cyan", d: "m68.906 80.823v-9.0213" })));
    }
}
export class Horizon extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.pitchGroupRef = FSComponent.createRef();
        this.rollGroupRef = FSComponent.createRef();
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const pf = this.props.bus.getSubscriber();
        pf.on('pitch').handle(pitch => {
            const newVal = new Arinc429Word(pitch);
            //console.log(newVal.value);
            this.pitchGroupRef.instance.setAttribute('transform', `translate(0 ${calculateHorizonOffsetFromPitch(-newVal.value)})`);
        });
        pf.on('roll').handle(roll => {
            const newVal = new Arinc429Word(roll);
            this.rollGroupRef.instance.setAttribute('transform', `rotate(${newVal.value} 68.814 80.730)`);
        });
    }
    render() {
        /*       if (!this.props.pitch.get().isNormalOperation() || !this.props.roll.isNormalOperation()) {
                  return <></>;
              }
           */
        /*   const yOffset = Math.max(Math.min(calculateHorizonOffsetFromPitch(-this.props.pitch.value), 31.563), -31.563); */
        const bugs = [];
        if (!Number.isNaN(this.props.selectedHeading) && !this.props.FDActive) {
            bugs.push([this.props.selectedHeading]);
        }
        return (FSComponent.buildComponent("g", { id: "RollGroup", ref: this.rollGroupRef },
            FSComponent.buildComponent("g", { id: "PitchGroup", ref: this.pitchGroupRef },
                FSComponent.buildComponent("path", { d: "m23.906 80.823v-160h90v160z", class: "SkyFill" }),
                FSComponent.buildComponent("path", { d: "m113.91 223.82h-90v-143h90z", class: "EarthFill" }),
                FSComponent.buildComponent("g", { class: "NormalStroke White" },
                    FSComponent.buildComponent("path", { d: "m66.406 85.323h5h0" }),
                    FSComponent.buildComponent("path", { d: "m64.406 89.823h9h0" }),
                    FSComponent.buildComponent("path", { d: "m66.406 94.073h5h0" }),
                    FSComponent.buildComponent("path", { d: "m59.406 97.823h19h0" }),
                    FSComponent.buildComponent("path", { d: "m64.406 103.82h9h0" }),
                    FSComponent.buildComponent("path", { d: "m59.406 108.82h19h0" }),
                    FSComponent.buildComponent("path", { d: "m55.906 118.82h26h0" }),
                    FSComponent.buildComponent("path", { d: "m52.906 138.82h32h0" }),
                    FSComponent.buildComponent("path", { d: "m47.906 168.82h42h0" }),
                    FSComponent.buildComponent("path", { d: "m66.406 76.323h5h0" }),
                    FSComponent.buildComponent("path", { d: "m64.406 71.823h9h0" }),
                    FSComponent.buildComponent("path", { d: "m66.406 67.323h5h0" }),
                    FSComponent.buildComponent("path", { d: "m59.406 62.823h19h0" }),
                    FSComponent.buildComponent("path", { d: "m66.406 58.323h5h0" }),
                    FSComponent.buildComponent("path", { d: "m64.406 53.823h9h0" }),
                    FSComponent.buildComponent("path", { d: "m66.406 49.323h5h0" }),
                    FSComponent.buildComponent("path", { d: "m59.406 44.823h19h0" }),
                    FSComponent.buildComponent("path", { d: "m66.406 40.573h5h0" }),
                    FSComponent.buildComponent("path", { d: "m64.406 36.823h9h0" }),
                    FSComponent.buildComponent("path", { d: "m66.406 33.573h5h0" }),
                    FSComponent.buildComponent("path", { d: "m55.906 30.823h26h0" }),
                    FSComponent.buildComponent("path", { d: "m52.906 10.823h32h0" }),
                    FSComponent.buildComponent("path", { d: "m47.906-19.177h42h0" })),
                FSComponent.buildComponent("g", { id: "PitchProtUpper", class: "NormalStroke Green" },
                    FSComponent.buildComponent("path", { d: "m51.506 31.523h4m-4-1.4h4" }),
                    FSComponent.buildComponent("path", { d: "m86.306 31.523h-4m4-1.4h-4" })),
                FSComponent.buildComponent("g", { id: "PitchProtLostUpper", style: "display: none", class: "NormalStroke Amber" },
                    FSComponent.buildComponent("path", { d: "m52.699 30.116 1.4142 1.4142m-1.4142 0 1.4142-1.4142" }),
                    FSComponent.buildComponent("path", { d: "m85.114 31.53-1.4142-1.4142m1.4142 0-1.4142 1.4142" })),
                FSComponent.buildComponent("g", { id: "PitchProtLower", class: "NormalStroke Green" },
                    FSComponent.buildComponent("path", { d: "m59.946 104.52h4m-4-1.4h4" }),
                    FSComponent.buildComponent("path", { d: "m77.867 104.52h-4m4-1.4h-4" })),
                FSComponent.buildComponent("g", { id: "PitchProtLostLower", style: "display: none", class: "NormalStroke Amber" },
                    FSComponent.buildComponent("path", { d: "m61.199 103.12 1.4142 1.4142m-1.4142 0 1.4142-1.4142" }),
                    FSComponent.buildComponent("path", { d: "m76.614 104.53-1.4142-1.4142m1.4142 0-1.4142 1.4142" })),
                FSComponent.buildComponent("path", { d: "m68.906 121.82-8.0829 14h2.8868l5.1962-9 5.1962 9h2.8868z", class: "NormalStroke Red" }),
                FSComponent.buildComponent("path", { d: "m57.359 163.82 11.547-20 11.547 20h-4.0414l-7.5056-13-7.5056 13z", class: "NormalStroke Red" }),
                FSComponent.buildComponent("path", { d: "m71.906 185.32v3.5h15l-18-18-18 18h15v-3.5h-6.5l9.5-9.5 9.5 9.5z", class: "NormalStroke Red" }),
                FSComponent.buildComponent("path", { d: "m60.824 13.823h2.8868l5.1962 9 5.1962-9h2.8868l-8.0829 14z", class: "NormalStroke Red" }),
                FSComponent.buildComponent("path", { d: "m61.401-13.177h-4.0414l11.547 20 11.547-20h-4.0414l-7.5056 13z", class: "NormalStroke Red" }),
                FSComponent.buildComponent("path", { d: "m68.906-26.177-9.5-9.5h6.5v-3.5h-15l18 18 18-18h-15v3.5h6.5z", class: "NormalStroke Red" }),
                FSComponent.buildComponent("path", { d: "m23.906 80.823h90h0", class: "NormalOutline" }),
                FSComponent.buildComponent("path", { d: "m23.906 80.823h90h0", class: "NormalStroke White" }),
                FSComponent.buildComponent("g", { class: "FontSmall White Fill EndAlign" },
                    FSComponent.buildComponent("text", { x: "55.729935", y: "64.812828" }, "10"),
                    FSComponent.buildComponent("text", { x: "88.618317", y: "64.812714" }, "10"),
                    FSComponent.buildComponent("text", { x: "54.710766", y: "46.931034" }, "20"),
                    FSComponent.buildComponent("text", { x: "89.564583", y: "46.930969" }, "20"),
                    FSComponent.buildComponent("text", { x: "50.867237", y: "32.910896" }, "30"),
                    FSComponent.buildComponent("text", { x: "93.408119", y: "32.910839" }, "30"),
                    FSComponent.buildComponent("text", { x: "48.308414", y: "12.690886" }, "50"),
                    FSComponent.buildComponent("text", { x: "96.054962", y: "12.690853" }, "50"),
                    FSComponent.buildComponent("text", { x: "43.050652", y: "-17.138285" }, "80"),
                    FSComponent.buildComponent("text", { x: "101.48304", y: "-17.138248" }, "80"),
                    FSComponent.buildComponent("text", { x: "55.781109", y: "99.81395" }, "10"),
                    FSComponent.buildComponent("text", { x: "88.669487", y: "99.813919" }, "10"),
                    FSComponent.buildComponent("text", { x: "54.645519", y: "110.8641" }, "20"),
                    FSComponent.buildComponent("text", { x: "89.892426", y: "110.86408" }, "20"),
                    FSComponent.buildComponent("text", { x: "51.001217", y: "120.96314" }, "30"),
                    FSComponent.buildComponent("text", { x: "93.280037", y: "120.96311" }, "30"),
                    FSComponent.buildComponent("text", { x: "48.220913", y: "140.69778" }, "50"),
                    FSComponent.buildComponent("text", { x: "96.090324", y: "140.69786" }, "50"),
                    FSComponent.buildComponent("text", { x: "43.125065", y: "170.80962" }, "80"),
                    FSComponent.buildComponent("text", { x: "101.38947", y: "170.80959" }, "80"))),
            FSComponent.buildComponent("path", { d: "m40.952 49.249v-20.562h55.908v20.562z", class: "NormalOutline SkyFill" }),
            FSComponent.buildComponent("path", { d: "m40.952 49.249v-20.562h55.908v20.562z", class: "NormalStroke White" }),
            FSComponent.buildComponent(SideslipIndicator, { bus: this.props.bus, instrument: this.props.instrument }),
            FSComponent.buildComponent(RisingGround, { bus: this.props.bus }),
            FSComponent.buildComponent(RadioAltAndDH, { bus: this.props.bus })));
    }
}
class RadioAltAndDH extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.visibilitySub = Subject.create('visible');
        this.offsetSub = Subject.create('');
        this.radioAltClassSub = Subject.create('');
        this.dhClassSub = Subject.create('');
        this.dhVisibilitySub = Subject.create('hidden');
        this.textSub = Subject.create('');
        this.roll = new Arinc429Word(0);
        this.dh = 0;
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('roll').handle(r => {
            const roll = new Arinc429Word(r);
            this.roll = roll;
        });
        sub.on('dh').handle(dh => {
            this.dh = dh;
        });
        sub.on('radio_alt').handle(ra => {
            if (ra > 2500) {
                this.visibilitySub.set('hidden');
            }
            else {
                this.visibilitySub.set('visible');
                const verticalOffset = calculateVerticalOffsetFromRoll(this.roll.value);
                this.offsetSub.set(`translate(0 ${-verticalOffset})`);
                const size = (ra > 400 ? 'FontLarge' : 'FontLargest');
                const DHValid = this.dh >= 0;
                const color = (ra > 400 || (ra > this.dh + 100 && DHValid) ? 'Green' : 'Amber');
                this.radioAltClassSub.set(`${size} ${color} MiddleAlign`);
                let text = '';
                if (ra < 5) {
                    text = Math.round(ra).toString();
                }
                else if (ra <= 50) {
                    text = (Math.round(ra / 5) * 5).toString();
                }
                else if (ra > 50 || (ra > this.dh + 100 && DHValid)) {
                    text = (Math.round(ra / 10) * 10).toString();
                }
                this.textSub.set(text);
                if (ra <= this.dh) {
                    this.dhClassSub.set('FontLargest Amber EndAlign Blink9Seconds');
                    this.dhVisibilitySub.set('visible');
                }
                else {
                    this.dhClassSub.set('FontLargest Amber EndAlign');
                    this.dhVisibilitySub.set('hidden');
                }
            }
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { visibility: this.visibilitySub, id: "DHAndRAGroup", transform: this.offsetSub },
            FSComponent.buildComponent("text", { id: "AttDHText", x: "73.511879", y: "113.19068", visibility: this.dhVisibilitySub, class: this.dhClassSub }, "DH"),
            FSComponent.buildComponent("text", { id: "RadioAlt", x: "68.803764", y: "119.88165", class: this.radioAltClassSub }, this.textSub)));
    }
}
;
class SideslipIndicator extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.sideslipIndicatorFilter = new LagFilter(0.8);
        this.classNameSub = Subject.create('Yellow');
        this.rollTriangleSub = Subject.create('');
        this.slideSlipSub = Subject.create('');
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('roll').whenChanged().handle(r => {
            const roll = new Arinc429Word(r);
            const verticalOffset = calculateVerticalOffsetFromRoll(roll.value);
            const isOnGround = SimVar.GetSimVarValue('SIM ON GROUND', 'number');
            let offset = 0;
            if (isOnGround) {
                // on ground, lateral g is indicated. max 0.3g, max deflection is 15mm
                const latAcc = SimVar.GetSimVarValue('ACCELERATION BODY X', 'G Force');
                const accInG = Math.min(0.3, Math.max(-0.3, latAcc));
                offset = -accInG * 15 / 0.3;
            }
            else {
                const beta = SimVar.GetSimVarValue('INCIDENCE BETA', 'degrees');
                const betaTarget = SimVar.GetSimVarValue('L:A32NX_BETA_TARGET', 'Number');
                offset = Math.max(Math.min(beta - betaTarget, 15), -15);
            }
            const betaTargetActive = SimVar.GetSimVarValue('L:A32NX_BETA_TARGET_ACTIVE', 'Number') === 1;
            const SIIndexOffset = this.sideslipIndicatorFilter.step(offset, this.props.instrument.deltaTime / 1000);
            this.rollTriangleSub.set(`translate(0 ${verticalOffset})`);
            this.classNameSub.set(`${betaTargetActive ? 'Cyan' : 'Yellow'}`);
            this.slideSlipSub.set(`translate(${SIIndexOffset} 0)`);
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { id: "RollTriangleGroup", transform: this.rollTriangleSub, class: "NormalStroke Yellow CornerRound" },
            FSComponent.buildComponent("path", { d: "m66.074 43.983 2.8604-4.2333 2.8604 4.2333z" }),
            FSComponent.buildComponent("path", { id: "SideSlipIndicator", transform: this.slideSlipSub, d: "m73.974 47.208-1.4983-2.2175h-7.0828l-1.4983 2.2175z" })));
    }
}
;
class RisingGround extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.lastRadioAlt = 0;
        this.lastPitch = new Arinc429Word(0);
        this.transformStringSub = Subject.create('');
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('pitch').whenChanged().handle(p => {
            const pitch = new Arinc429Word(p);
            this.lastPitch = pitch;
            const targetPitch = -0.1 * this.lastRadioAlt;
            const targetOffset = Math.max(Math.min(calculateHorizonOffsetFromPitch((-pitch.value) - targetPitch) - 31.563, 0), -63.093);
            this.transformStringSub.set(`translate(0 ${targetOffset})`);
        });
        sub.on('radio_alt').whenChanged().handle(p => {
            const radio_alt = p;
            this.lastRadioAlt = radio_alt;
            const targetPitch = -0.1 * radio_alt;
            const targetOffset = Math.max(Math.min(calculateHorizonOffsetFromPitch((-this.lastPitch.value) - targetPitch) - 31.563, 0), -63.093);
            this.transformStringSub.set(`translate(0 ${targetOffset})`);
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { id: "HorizonGroundRectangle", transform: this.transformStringSub },
            FSComponent.buildComponent("path", { d: "m113.95 157.74h-90.08v-45.357h90.08z", class: "NormalOutline EarthFill" }),
            FSComponent.buildComponent("path", { d: "m113.95 157.74h-90.08v-45.357h90.08z", class: "NormalStroke White" })));
    }
}
;
//# sourceMappingURL=horizon.js.map