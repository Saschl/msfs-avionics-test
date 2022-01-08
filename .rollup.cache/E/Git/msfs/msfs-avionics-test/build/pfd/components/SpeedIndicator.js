import { LagFilter, RateLimiter, SmoothSin, VerticalTape } from './PFDUtils';
import { DisplayComponent, FSComponent, Subject } from 'msfssdk';
import { Arinc429Word } from '../shared/arinc429';
const ValueSpacing = 10;
const DistanceSpacing = 10;
const DisplayRange = 42;
const GraduationElement = (speed, offset) => {
    if (speed < 30) {
        return null;
    }
    let text = '';
    if (speed % 20 === 0) {
        text = Math.abs(speed).toString().padStart(3, '0');
    }
    return (FSComponent.buildComponent("g", { transform: `translate(0 ${offset})` },
        FSComponent.buildComponent("path", { class: "NormalStroke White", d: "m19.031 80.818h-2.8206" }),
        FSComponent.buildComponent("text", { class: "FontMedium MiddleAlign White", x: "7.7348943", y: "82.936722" }, text)));
};
class V1BugElement extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.offsetSub = Subject.create('');
        this.visibilitySub = Subject.create('visible');
        this.flightPhase = 0;
        this.v1Speed = 0;
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const pf = this.props.bus.getSubscriber();
        pf.on('v1').whenChanged().handle(g => {
            this.v1Speed = g;
            this.getV1Offset();
            this.getV1Visibility();
        });
        pf.on('flightPhase').whenChanged().handle(g => {
            this.flightPhase = this.flightPhase;
            this.getV1Visibility();
        });
    }
    getV1Offset() {
        const offset = -this.v1Speed * DistanceSpacing / ValueSpacing;
        this.offsetSub.set(`translate(0 ${offset})`);
    }
    getV1Visibility() {
        if (this.flightPhase <= 4 && this.v1Speed !== 0) {
            this.visibilitySub.set('visible');
        }
        else {
            this.visibilitySub.set('hidden');
        }
    }
    render() {
        return (FSComponent.buildComponent("g", { id: "V1BugGroup", transform: this.offsetSub, visibility: this.visibilitySub },
            FSComponent.buildComponent("path", { class: "NormalStroke Cyan", d: "m16.613 80.82h5.4899" }),
            FSComponent.buildComponent("text", { class: "FontLarge MiddleAlign Cyan", x: "26.205544", y: "82.96" }, "1")));
    }
}
const VRBugElement = (offset) => (FSComponent.buildComponent("path", { id: "RotateSpeedMarker", class: "NormalStroke Cyan", transform: `translate(0 ${offset})`, d: "m21.549 80.82a1.2592 1.2599 0 1 0-2.5184 0 1.2592 1.2599 0 1 0 2.5184 0z" }));
const GreenDotBugElement = (offset) => (FSComponent.buildComponent("g", { id: "GreenDotSpeedMarker", transform: `translate(0 ${offset})` },
    FSComponent.buildComponent("path", { class: "ThickOutline", d: "m20.29 80.85a1.2592 1.2599 0 1 0-2.5184 0 1.2592 1.2599 0 1 0 2.5184 0z" }),
    FSComponent.buildComponent("path", { class: "ThickStroke Green", d: "m20.29 80.85a1.2592 1.2599 0 1 0-2.5184 0 1.2592 1.2599 0 1 0 2.5184 0z" })));
const FlapRetractBugElement = (offset) => (FSComponent.buildComponent("g", { id: "FlapsSlatsBug", transform: `translate(0 ${offset})` },
    FSComponent.buildComponent("path", { class: "NormalStroke Green", d: "m19.031 80.82h3.8279" }),
    FSComponent.buildComponent("text", { class: "FontLarge MiddleAlign Green", x: "27.236509", y: "83.327988" }, "F")));
const SlatRetractBugElement = (offset) => (FSComponent.buildComponent("g", { id: "FlapsSlatsBug", transform: `translate(0 ${offset})` },
    FSComponent.buildComponent("path", { class: "NormalStroke Green", d: "m19.031 80.82h3.8279" }),
    FSComponent.buildComponent("text", { class: "FontLarge MiddleAlign Green", x: "27.236509", y: "83.327988" }, "S")));
const VFENextBugElement = (offset) => (FSComponent.buildComponent("path", { id: "VFeNextMarker", transform: `translate(0 ${offset})`, class: "NormalStroke Amber", d: "m19.031 81.34h-2.8709m0-1.0079h2.8709" }));
/*
const VAlphaProtBar = (offset: number) => (
    <path transform={`translate(0 ${offset})`} class="BarAmber" d="m21.952 82.254v1.5119m-0.94654-2.923h0.94654v1.4111h-2.9213v-1.4111z" />);
 */
const VMaxBar = (offset) => (FSComponent.buildComponent("path", { transform: `translate(0 ${offset})`, class: "BarRed", d: "m22.053 78.381v-2.6206m-3.022 5.0397h3.022v-2.4191h-3.022z" }));
const VProtBug = (offset) => (FSComponent.buildComponent("g", { id: "SpeedProtSymbol", transform: `translate(0 ${offset})` },
    FSComponent.buildComponent("path", { class: "NormalOutline", d: "m13.994 81.289h3.022m-3.022-1.0079h3.022" }),
    FSComponent.buildComponent("path", { class: "NormalStroke Green", d: "m13.994 81.289h3.022m-3.022-1.0079h3.022" }),
    FSComponent.buildComponent("path", { style: { display: 'none' }, class: "NormalStroke Amber", d: "m14.615 79.915 1.7808 1.7818m-1.7808 0 1.7808-1.7818" })));
export class AirspeedIndicator extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.speedSub = Subject.create(0);
        this.speedTapeOutlineRef = FSComponent.createRef();
        this.alphaProtRef = [];
        this.lastAlphaProtSub = Subject.create(0);
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const pf = this.props.bus.getSubscriber();
        pf.on('speed').handle(a => {
            this.speedSub.set(a);
            const airSpeed = new Arinc429Word(a);
            const length = 42.9 + Math.max(Math.max(Math.min(airSpeed.value, 72.1), 30) - 30, 0);
            this.speedTapeOutlineRef.instance.setAttribute('d', `m19.031 38.086v${length}`);
        });
        pf.on('alpha_prot').handle(a => {
            // ALPHA PROT -> SUB ON ALPHA PROT
            /* if (showBars) {
                bugs.push(...BarberpoleIndicator(new Arinc429Word(this.speedSub.get()), a, false, DisplayRange, VAlphaProtBar, 2.923));
            } */
            this.alphaProtRef.forEach((el, index) => {
                const elementValue = a + -1 * 2.923 * index;
                const offset = -elementValue * DistanceSpacing / ValueSpacing;
                el.instance.setAttribute('transform', `translate(0 ${offset})`);
            });
            this.lastAlphaProtSub.set(a);
        });
        // showBars replacement
        pf.on('onGround').whenChanged().handle(g => {
            if (g === 1) {
                this.alphaProtRef.forEach(el => {
                    el.instance.setAttribute('visibility', 'hidden');
                });
            }
            else {
                setTimeout(() => {
                    this.alphaProtRef.forEach(el => {
                        el.instance.setAttribute('visibility', 'visible');
                    });
                }, 10000);
            }
        });
    }
    createAlphaProtBarberPole() {
        let i = 0;
        const group = [];
        for (i; i < 8; i++) {
            const apref = FSComponent.createRef();
            group.push(FSComponent.buildComponent("g", { id: "alpha-prot", ref: apref },
                FSComponent.buildComponent("path", { class: "BarAmber", d: "m21.952 82.254v1.5119m-0.94654-2.923h0.94654v1.4111h-2.9213v-1.4111z" }),
                ");"));
            this.alphaProtRef.push(apref);
        }
        return group;
    }
    render() {
        /*   if (Number.isNaN(airspeed)) {
              return (
                  <>
                      <path id="SpeedTapeBackground" class="TapeBackground" d="m1.9058 123.56v-85.473h17.125v85.473z" />
                      <text id="SpeedFailText" class="Blink9Seconds FontLargest EndAlign Red" x="17.756115" y="83.386398">SPD</text>
                      <SpeedTapeOutline airspeed={100} isRed />
                  </>
              );
              
              } */
        const length = 42.9 + Math.max(Math.max(Math.min(this.speedSub.get(), 72.1), 30) - 30, 0);
        return (FSComponent.buildComponent("g", { id: "SpeedTapeElementsGroup" },
            FSComponent.buildComponent("path", { id: "SpeedTapeBackground", class: "TapeBackground", d: "m1.9058 123.56v-85.473h17.125v85.473z" }),
            FSComponent.buildComponent("path", { id: "SpeedTapeOutlineRight", ref: this.speedTapeOutlineRef, class: 'NormalStroke White', d: `m19.031 38.086v${length}` }),
            FSComponent.buildComponent(VerticalTape, { tapeValue: this.speedSub, bugs: [], lowerLimit: 30, upperLimit: 660, valueSpacing: ValueSpacing, displayRange: DisplayRange + 6, distanceSpacing: DistanceSpacing, type: 'speed' },
                this.createAlphaProtBarberPole(),
                FSComponent.buildComponent(V1BugElement, { bus: this.props.bus })),
            FSComponent.buildComponent(SpeedTrendArrow, { airspeed: this.speedSub, instrument: this.props.instrument }),
            FSComponent.buildComponent(VLsBar, { airspeed: this.speedSub, VAlphaProt: this.lastAlphaProtSub }),
            FSComponent.buildComponent(VAlphaLimBar, { airspeed: this.speedSub })));
    }
}
export class AirspeedIndicatorOfftape extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.lowerRef = FSComponent.createRef();
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const subscriber = this.props.bus.getSubscriber();
        subscriber.on('speed').whenChanged().handle(s => {
            const newVal = new Arinc429Word(s);
            if (Number.isNaN(newVal.value)) {
                // DOES NOT WORK PROEPRLY AS IT WOULD ADD AN ELEMENT EACH TIME
                /*    FSComponent.render(
                       <>
                           <path id="SpeedTapeOutlineUpper" class="NormalStroke Red" d="m1.9058 38.086h21.859" />
                           <path id="SpeedTapeOutlineLower" class="NormalStroke Red" d="m1.9058 123.56h21.859" />
                       </>
                   ,this.lowerRef.instance); */
            }
            else {
                const clampedSpeed = Math.max(Math.min(newVal.value, 660), 30);
                const showLower = clampedSpeed > 72;
                if (showLower) {
                    this.lowerRef.instance.setAttribute('visibility', 'visible');
                }
                else {
                    this.lowerRef.instance.setAttribute('visibility', 'hidden');
                }
            }
        });
    }
    render() {
        // const clampedTargetSpeed = Math.max(Math.min(targetSpeed, 660), 30);
        return (FSComponent.buildComponent("g", { id: "SpeedOfftapeGroup" },
            FSComponent.buildComponent("path", { id: "SpeedTapeOutlineUpper", class: "NormalStroke White", d: "m1.9058 38.086h21.859" }),
            FSComponent.buildComponent("path", { class: "Fill Yellow SmallOutline", d: "m13.994 80.46v0.7257h6.5478l3.1228 1.1491v-3.0238l-3.1228 1.1491z" }),
            FSComponent.buildComponent("path", { class: "Fill Yellow SmallOutline", d: "m0.092604 81.185v-0.7257h2.0147v0.7257z" }),
            FSComponent.buildComponent("path", { id: "SpeedTapeOutlineLower", ref: this.lowerRef, class: "NormalStroke White", d: "m1.9058 123.56h21.859" })));
    }
}
class SpeedTrendArrow extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.refElement = FSComponent.createRef();
        this.arrowBaseRef = FSComponent.createRef();
        this.arrowHeadRef = FSComponent.createRef();
        this.offset = Subject.create('');
        this.pathString = Subject.create('');
        this.lagFilter = new LagFilter(1.2);
        this.airspeedAccRateLimiter = new RateLimiter(1.2, -1.2);
        this.previousAirspeed = 0;
        this.previousTime = new Date().appTime();
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        this.props.airspeed.sub(a => {
            const currentTime = new Date().appTime();
            const deltaTime = this.props.instrument.deltaTime; // (currentTime - this.previousTime);
            const newValue = new Arinc429Word(a);
            const clamped = newValue.isNormalOperation() ? Math.max(newValue.value, 30) : NaN;
            const airspeedAcc = (clamped - this.previousAirspeed) / deltaTime * 1000;
            this.previousAirspeed = clamped;
            const rateLimitedAirspeedAcc = this.airspeedAccRateLimiter.step(airspeedAcc, deltaTime / 1000);
            const filteredAirspeedAcc = this.lagFilter.step(rateLimitedAirspeedAcc, deltaTime / 1000);
            //const airspeedAcc = this.lagFilter.step(newValue.value, deltaTime);
            //console.log(filteredAirspeedAcc);
            const targetSpeed = filteredAirspeedAcc * 10;
            const sign = Math.sign(filteredAirspeedAcc);
            const offset = -targetSpeed * DistanceSpacing / ValueSpacing;
            let pathString;
            const neutralPos = 80.823;
            if (sign > 0) {
                pathString = `m15.455 ${neutralPos + offset} l -1.2531 2.4607 M15.455 ${neutralPos + offset} l 1.2531 2.4607`;
            }
            else {
                pathString = `m15.455 ${neutralPos + offset} l 1.2531 -2.4607 M15.455 ${neutralPos + offset} l -1.2531 -2.4607`;
            }
            this.offset.set(`m15.455 80.823v${offset.toFixed(10)}`);
            this.pathString.set(pathString);
            if (Math.abs(targetSpeed) < 1) {
                this.refElement.instance.setAttribute('visibility', 'hidden');
                // this.arrowBaseRef.instance.setAttribute('d', `m15.455 80.823v${offset}`)
                // this.arrowHeadRef.instance.setAttribute('d', pathString)
            }
            else {
                this.refElement.instance.setAttribute('visibility', 'visible');
            }
            this.previousTime = currentTime;
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { id: "SpeedTrendArrow", ref: this.refElement },
            FSComponent.buildComponent("path", { id: "SpeedTrendArrowBase", ref: this.arrowBaseRef, class: "NormalStroke Yellow", d: this.offset }),
            FSComponent.buildComponent("path", { id: "SpeedTrendArrowHead", ref: this.arrowHeadRef, class: "NormalStroke Yellow", d: this.pathString })));
    }
}
class VLsBar extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.previousTime = new Date().appTime();
        this.lastVls = 0;
        this.vlsPath = Subject.create('');
        this.lastVAlphaProt = 0;
        this.lastAirSpeed = new Arinc429Word(0);
        this.smoothSpeeds = (vlsDestination) => {
            const currentTime = new Date().appTime();
            const deltaTime = currentTime - this.previousTime;
            const seconds = deltaTime / 1000;
            this.lastVls = SmoothSin(this.lastVls, vlsDestination, 0.5, seconds);
            return this.lastVls;
        };
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        this.props.VAlphaProt.sub(alpha => {
            this.lastVAlphaProt = alpha;
            const airSpeed = this.lastAirSpeed;
            const VLs = this.smoothSpeeds(SimVar.GetSimVarValue('L:A32NX_SPEEDS_VLS', 'number'));
            const VLsPos = (airSpeed.value - VLs) * DistanceSpacing / ValueSpacing + 80.818;
            const offset = (VLs - this.lastVAlphaProt) * DistanceSpacing / ValueSpacing;
            this.vlsPath.set(`m19.031 ${VLsPos}h 1.9748v${offset}`);
        });
        this.props.airspeed.sub(s => {
            const airSpeed = new Arinc429Word(s);
            this.lastAirSpeed = airSpeed;
            const VLs = this.smoothSpeeds(SimVar.GetSimVarValue('L:A32NX_SPEEDS_VLS', 'number'));
            const VLsPos = (airSpeed.value - VLs) * DistanceSpacing / ValueSpacing + 80.818;
            const offset = (VLs - this.lastVAlphaProt) * DistanceSpacing / ValueSpacing;
            this.vlsPath.set(`m19.031 ${VLsPos}h 1.9748v${offset}`);
        });
        /*     if (VLs - airspeed < -DisplayRange) {
                return null;
            }
         */
    }
    render() {
        return (FSComponent.buildComponent("path", { id: "VLsIndicator", class: "NormalStroke Amber", d: this.vlsPath }));
    }
}
;
class VAlphaLimBar extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.offsetPath = Subject.create('');
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        this.props.airspeed.sub(s => {
            const airSpeed = new Arinc429Word(s);
            const VAlphalim = SimVar.GetSimVarValue('L:A32NX_SPEEDS_ALPHA_MAX', 'number');
            if (VAlphalim - airSpeed.value < -DisplayRange) {
                return null;
            }
            const delta = airSpeed.value - DisplayRange - VAlphalim;
            const offset = delta * DistanceSpacing / ValueSpacing;
            this.offsetPath.set(`m19.031 123.56h3.425v${offset}h-3.425z`);
        });
    }
    render() {
        return (FSComponent.buildComponent("path", { id: "VAlimIndicator", class: "Fill Red", d: this.offsetPath }));
    }
}
/* const SpeedTarget = ({ airspeed, targetSpeed, isManaged }) => {
    const color = isManaged ? 'Magenta' : 'Cyan';
    const text = Math.round(targetSpeed).toString().padStart(3, '0');
    if (airspeed - targetSpeed > DisplayRange) {
        return (
            <text id="SelectedSpeedLowerText" class={`FontSmallest EndAlign ${color}`} x="23.994415" y="128.3132">{text}</text>
        );
    } if (airspeed - targetSpeed < -DisplayRange) {
        return (
            <text id="SelectedSpeedLowerText" class={`FontSmallest EndAlign ${color}`} x="23.994289" y="36.750431">{text}</text>
        );
    }
    const offset = (airspeed - targetSpeed) * DistanceSpacing / ValueSpacing;
    return (
        <path class={`NormalStroke ${color} CornerRound`} transform={`translate(0 ${offset})`} d="m19.274 81.895 5.3577 1.9512v-6.0476l-5.3577 1.9512" />
    );
}; */
/*  private createBugs(): [] {
        
 const ValphaMax = getSimVar('L:A32NX_SPEEDS_ALPHA_MAX', 'number');

 const bugs: [(offset: number) => JSX.Element, number][] = [];


 //VMAX
 bugs.push(...BarberpoleIndicator(airspeed, VMax, true, DisplayRange, VMaxBar, 5.040));


 //VPROT
 const showVProt = VMax > 240;
 if (showVProt) {
     bugs.push([VProtBug, VMax + 6]);
 }

 const clampedSpeed = Math.max(Math.min(airspeed, 660), 30);

 const flapsHandleIndex = getSimVar('L:A32NX_FLAPS_HANDLE_INDEX', 'Number');

 let v1 = NaN;
 if (FWCFlightPhase <= 4) {
     //V1 -> GET FLIGHT PHASE IN SUB
     v1 = getSimVar('L:AIRLINER_V1_SPEED', 'knots');
     if (v1 !== 0) {
         bugs.push([V1BugElement, Math.max(Math.min(v1, 660), 30)]);
     }

     //VR -> GET FLIGHT PHASE IN SUB
     const vr = getSimVar('L:AIRLINER_VR_SPEED', 'knots');
     if (vr !== 0) {
         bugs.push([VRBugElement, Math.max(Math.min(vr, 660), 30)]);
     }
 }

 // SUB ON FLAPSHANDLEINDEX
 if (flapsHandleIndex === 0) {
     const GreenDotSpeed = getSimVar('L:A32NX_SPEEDS_GD', 'number');
     bugs.push([GreenDotBugElement, GreenDotSpeed]);
 } else if (flapsHandleIndex === 1) {
     const SlatRetractSpeed = getSimVar('L:A32NX_SPEEDS_S', 'number');
     bugs.push([SlatRetractBugElement, SlatRetractSpeed]);
 } else if (flapsHandleIndex === 2 || flapsHandleIndex === 3) {
     const FlapRetractSpeed = getSimVar('L:A32NX_SPEEDS_F', 'number');
     bugs.push([FlapRetractBugElement, FlapRetractSpeed]);
 }

 // IDK maybe sub on altitude
 if (altitude.isNormalOperation() && altitude.value < 15000 && flapsHandleIndex < 4) {
     const VFENext = getSimVar('L:A32NX_SPEEDS_VFEN', 'number');
     bugs.push([VFENextBugElement, VFENext]);
 }
 return bugs;

} */
/*

interface MachNumberProps {
    mach: Arinc429Word,
}

export const MachNumber = ({ mach }: MachNumberProps) => {
    const machPermille = Math.round(mach.valueOr(0) * 1000);
    const [showMach, setShowMach] = useState(machPermille > 500);

    useEffect(() => {
        if (showMach && machPermille < 450) {
            setShowMach(false);
        }
        if (!showMach && machPermille > 500) {
            setShowMach(true);
        }
    }, [showMach, machPermille]);

    if (!mach.isNormalOperation()) {
        return (
            <text id="MachFailText" class="Blink9Seconds FontLargest StartAlign Red" x="5.4257932" y="136.88908">MACH</text>
        );
    }

    if (!showMach) {
        return null;
    }

    return (
        <text id="CurrentMachText" class="FontLargest StartAlign Green" x="5.4257932" y="136.88908">{`.${machPermille}`}</text>
    );
};

const V1Offtape = ({ airspeed, v1 }) => {
    if (v1 - airspeed > DisplayRange) {
        return (
            <text id="V1SpeedText" class="FontTiny Cyan" x="21.144159" y="43.103134">{Math.round(v1)}</text>
        );
    }
    return null;
};

// Needs filtering, not going to use until then
 */
//# sourceMappingURL=SpeedIndicator.js.map