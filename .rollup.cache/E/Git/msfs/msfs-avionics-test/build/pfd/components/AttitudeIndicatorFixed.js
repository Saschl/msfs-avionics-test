import { DisplayComponent, FSComponent, Subject } from 'msfssdk';
import { Arinc429Word } from '../shared/arinc429';
export class AttitudeIndicatorFixedUpper extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.roll = new Arinc429Word(0);
        this.pitch = new Arinc429Word(0);
        this.visibilitySub = Subject.create('hidden');
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('roll').whenChanged().handle(r => {
            this.roll = new Arinc429Word(r);
            if (!this.roll.isNormalOperation()) {
                this.visibilitySub.set('hidden');
            }
            else {
                this.visibilitySub.set('visible');
            }
        });
        sub.on('pitch').whenChanged().handle(p => {
            this.pitch = new Arinc429Word(p);
            if (!this.pitch.isNormalOperation()) {
                this.visibilitySub.set('hidden');
            }
            else {
                this.visibilitySub.set('visible');
            }
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { id: "AttitudeUpperInfoGroup", visibility: this.visibilitySub },
            FSComponent.buildComponent("g", { id: "RollProtGroup", class: "NormalStroke Green" },
                FSComponent.buildComponent("path", { id: "RollProtRight", d: "m105.64 62.887 1.5716-0.8008m-1.5716-0.78293 1.5716-0.8008" }),
                FSComponent.buildComponent("path", { id: "RollProtLeft", d: "m32.064 61.303-1.5716-0.8008m1.5716 2.3845-1.5716-0.8008" })),
            FSComponent.buildComponent("g", { id: "RollProtLost", style: "display: none", class: "NormalStroke Amber" },
                FSComponent.buildComponent("path", { id: "RollProtLostRight", d: "m107.77 60.696-1.7808 1.7818m1.7808 0-1.7808-1.7818" }),
                FSComponent.buildComponent("path", { id: "RollProtLostLeft", d: "m30.043 62.478 1.7808-1.7818m-1.7808 0 1.7808 1.7818" })),
            FSComponent.buildComponent("g", { class: "NormalStroke White" },
                FSComponent.buildComponent("path", { d: "m98.645 51.067 2.8492-2.8509" }),
                FSComponent.buildComponent("path", { d: "m39.168 51.067-2.8492-2.8509" }),
                FSComponent.buildComponent("path", { d: "m90.858 44.839a42.133 42.158 0 0 0-43.904 0" }),
                FSComponent.buildComponent("path", { d: "m89.095 43.819 1.8313-3.1738 1.7448 1.0079-1.8313 3.1738" }),
                FSComponent.buildComponent("path", { d: "m84.259 41.563 0.90817-2.4967-1.8932-0.68946-0.90818 2.4966" }),
                FSComponent.buildComponent("path", { d: "m75.229 39.142 0.46109-2.6165 1.9841 0.35005-0.46109 2.6165" }),
                FSComponent.buildComponent("path", { d: "m60.6 39.492-0.46109-2.6165 1.9841-0.35005 0.46109 2.6165" }),
                FSComponent.buildComponent("path", { d: "m53.553 41.563-0.90818-2.4967 0.9466-0.34474 0.9466-0.34472 0.90818 2.4966" }),
                FSComponent.buildComponent("path", { d: "m46.973 44.827-1.8313-3.1738 1.7448-1.0079 1.8313 3.1738" })),
            FSComponent.buildComponent("path", { class: "NormalStroke Yellow CornerRound", d: "m68.906 38.650-2.5184-3.7000h5.0367l-2.5184 3.7000" })));
    }
}
export class AttitudeIndicatorFixedCenter extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.roll = new Arinc429Word(0);
        this.pitch = new Arinc429Word(0);
        this.visibilitySub = Subject.create('hidden');
        this.attExcessiveVisibilitySub = Subject.create('false');
    }
    updaetAttExcessive() {
        if (this.pitch.isNormalOperation() && ((this.pitch.value > 25 || this.pitch.value < -13)) || (this.roll.isNormalOperation() && Math.abs(this.roll.value) > 45)) {
            this.attExcessiveVisibilitySub.set('hidden');
        }
        else if (this.pitch.isNormalOperation() && -this.pitch.value < 22 && -this.pitch.value > -10 && this.roll.isNormalOperation() && Math.abs(this.roll.value) < 40) {
            this.attExcessiveVisibilitySub.set('visible');
        }
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('roll').whenChanged().handle(r => {
            this.roll = new Arinc429Word(r);
            if (!this.roll.isNormalOperation()) {
                this.visibilitySub.set('hidden');
            }
            else {
                this.visibilitySub.set('visible');
            }
            this.updaetAttExcessive();
        });
        sub.on('pitch').whenChanged().handle(p => {
            this.pitch = new Arinc429Word(p);
            if (!this.pitch.isNormalOperation()) {
                this.visibilitySub.set('hidden');
            }
            else {
                this.visibilitySub.set('visible');
            }
            this.updaetAttExcessive();
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { id: "AttitudeSymbolsGroup" },
            FSComponent.buildComponent("path", { class: "Yellow Fill", d: "m115.52 80.067v1.5119h-8.9706v-1.5119z" }),
            FSComponent.buildComponent(SidestickIndicator, { bus: this.props.bus }),
            FSComponent.buildComponent("path", { class: "BlackFill", d: "m67.647 82.083v-2.5198h2.5184v2.5198z" }),
            FSComponent.buildComponent("g", { visibility: this.attExcessiveVisibilitySub },
                FSComponent.buildComponent(FDYawBar, { bus: this.props.bus }),
                FSComponent.buildComponent(FlightDirector, { bus: this.props.bus })),
            FSComponent.buildComponent("path", { class: "NormalOutline", d: "m67.647 82.083v-2.5198h2.5184v2.5198z" }),
            FSComponent.buildComponent("path", { class: "NormalStroke Yellow", d: "m67.647 82.083v-2.5198h2.5184v2.5198z" }),
            FSComponent.buildComponent("g", { class: "NormalOutline" },
                FSComponent.buildComponent("path", { d: "m88.55 86.114h2.5184v-4.0317h12.592v-2.5198h-15.11z" }),
                FSComponent.buildComponent("path", { d: "m34.153 79.563h15.11v6.5516h-2.5184v-4.0317h-12.592z" })),
            FSComponent.buildComponent("g", { id: "FixedAircraftReference", class: "NormalStroke Yellow BlackFill" },
                FSComponent.buildComponent("path", { d: "m88.55 86.114h2.5184v-4.0317h12.592v-2.5198h-15.11z" }),
                FSComponent.buildComponent("path", { d: "m34.153 79.563h15.11v6.5516h-2.5184v-4.0317h-12.592z" }))));
    }
}
class FDYawBar extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.lateralMode = 0;
        this.fdYawCommand = 0;
        this.fdActive = false;
        this.yawRef = FSComponent.createRef();
    }
    isActive() {
        if (!this.fdActive || !(this.lateralMode === 40 || this.lateralMode === 33 || this.lateralMode === 34)) {
            return false;
        }
        else {
            return true;
        }
    }
    setOffset() {
        const offset = -Math.max(Math.min(this.fdYawCommand, 45), -45) * 0.44;
        this.yawRef.instance.setAttribute('visibility', 'true');
        this.yawRef.instance.setAttribute('transform', `translate(${offset} 0)`);
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('fdYawCommand').whenChanged().handle(fy => {
            this.fdYawCommand = fy;
            if (this.isActive()) {
                this.setOffset();
            }
            else {
                this.yawRef.instance.setAttribute('visibility', 'hidden');
            }
        });
        sub.on('activeLateralMode').whenChanged().handle(lm => {
            this.lateralMode = lm;
            if (this.isActive()) {
                this.setOffset();
            }
            else {
                this.yawRef.instance.setAttribute('visibility', 'hidden');
            }
        });
        // FIXME, differentiate between 1 and 2 (left and right seat)
        sub.on('fd1Active').whenChanged().handle(fd => {
            this.fdActive = fd;
            if (this.isActive()) {
                this.setOffset();
            }
            else {
                this.yawRef.instance.setAttribute('visibility', 'false');
            }
        });
    }
    render() {
        return (FSComponent.buildComponent("path", { ref: this.yawRef, id: "GroundYawSymbol", class: "NormalStroke Green", d: "m67.899 82.536v13.406h2.0147v-13.406l-1.0074-1.7135z" }));
    }
}
;
class FlightDirector extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.lateralMode = 0;
        this.verticalMode = 0;
        this.fdActive = false;
        this.fdBank = 0;
        this.fdPitch = 0;
        this.fdRef = FSComponent.createRef();
        this.lateralRef1 = FSComponent.createRef();
        this.lateralRef2 = FSComponent.createRef();
        this.verticalRef1 = FSComponent.createRef();
        this.verticalRef2 = FSComponent.createRef();
    }
    setOffset() {
        const showLateralFD = this.lateralMode !== 0 && this.lateralMode !== 34 && this.lateralMode !== 40;
        const showVerticalFD = this.verticalMode !== 0 && this.verticalMode !== 34;
        let FDRollOffset = 0;
        let FDPitchOffset = 0;
        if (showLateralFD) {
            const FDRollOrder = this.fdBank;
            FDRollOffset = Math.min(Math.max(FDRollOrder, -45), 45) * 0.44;
            this.lateralRef1.instance.setAttribute('visibility', 'visible');
            this.lateralRef1.instance.setAttribute('transform', `translate(${FDRollOffset} 0)`);
            this.lateralRef2.instance.setAttribute('visibility', 'visible');
            this.lateralRef2.instance.setAttribute('transform', `translate(${FDRollOffset} 0)`);
        }
        if (showVerticalFD) {
            const FDPitchOrder = this.fdPitch;
            FDPitchOffset = Math.min(Math.max(FDPitchOrder, -22.5), 22.5) * 0.89;
            this.verticalRef1.instance.setAttribute('visibility', 'visible');
            this.verticalRef1.instance.setAttribute('transform', `translate(0 ${FDPitchOffset})`);
            this.verticalRef2.instance.setAttribute('visibility', 'visible');
            this.verticalRef2.instance.setAttribute('transform', `translate(0 ${FDPitchOffset})`);
        }
    }
    isActive() {
        if (!this.fdActive || !(this.lateralMode === 40 || this.lateralMode === 33 || this.lateralMode === 34) || SimVar.GetSimVarValue('L:A32NX_TRK_FPA_MODE_ACTIVE', 'bool')) {
            return false;
        }
        else {
            return true;
        }
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        /*    sub.on('fdYawCommand').whenChanged().handle(fy => {
               this.fdYawCommand = fy;
   
               if(this.isActive()) {
                   this.setOffset()
               } else {
                   this.fdRef.instance.setAttribute('visibility', 'false')
               }
           }) */
        sub.on('activeLateralMode').whenChanged().handle(vm => {
            this.verticalMode = vm;
            if (this.isActive()) {
                this.fdRef.instance.setAttribute('visibility', 'visible');
            }
            else {
                this.fdRef.instance.setAttribute('visibility', 'hidden');
            }
        });
        sub.on('activeVerticalMode').whenChanged().handle(lm => {
            this.lateralMode = lm;
            if (this.isActive()) {
                this.fdRef.instance.setAttribute('visibility', 'visible');
            }
            else {
                this.fdRef.instance.setAttribute('visibility', 'hidden');
            }
        });
        // FIXME, differentiate between 1 and 2 (left and right seat)
        sub.on('fd1Active').whenChanged().handle(fd => {
            this.fdActive = fd;
            if (this.isActive()) {
                this.fdRef.instance.setAttribute('visibility', 'visible');
            }
            else {
                this.fdRef.instance.setAttribute('visibility', 'hidden');
            }
        });
        sub.on('fdBank').whenChanged().handle(fd => {
            this.fdBank = fd;
            if (this.isActive()) {
                this.fdRef.instance.setAttribute('visibility', 'visible');
            }
            else {
                this.fdRef.instance.setAttribute('visibility', 'hidden');
                this.setOffset();
            }
        });
        sub.on('fdPitch').whenChanged().handle(fd => {
            this.fdPitch = fd;
            if (this.isActive()) {
                this.fdRef.instance.setAttribute('visibility', 'visible');
            }
            else {
                this.fdRef.instance.setAttribute('visibility', 'hidden');
                this.setOffset();
            }
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { ref: this.fdRef },
            FSComponent.buildComponent("g", { class: "ThickOutline" },
                FSComponent.buildComponent("path", { ref: this.lateralRef1, d: "m68.903 61.672v38.302" }),
                FSComponent.buildComponent("path", { ref: this.verticalRef1, d: "m49.263 80.823h39.287" })),
            FSComponent.buildComponent("g", { class: "ThickStroke Green" },
                FSComponent.buildComponent("path", { ref: this.lateralRef2, id: "FlightDirectorRoll", d: "m68.903 61.672v38.302" }),
                FSComponent.buildComponent("path", { ref: this.verticalRef2, id: "FlightDirectorPitch", d: "m49.263 80.823h39.287" }))));
    }
}
;
class SidestickIndicator extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.sideStickX = 0;
        this.sideStickY = 0;
        this.crossHairRef = FSComponent.createRef();
        this.onGroundForVisibility = Subject.create('visible');
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('sideStickX').whenChanged().handle(x => {
            this.sideStickX = x * 29.56;
            const onGround = SimVar.GetSimVarValue('SIM ON GROUND', 'number');
            const oneEngineRunning = SimVar.GetSimVarValue('GENERAL ENG COMBUSTION:1', 'bool') || SimVar.GetSimVarValue('GENERAL ENG COMBUSTION:2', 'bool');
            if (onGround === 0 || !oneEngineRunning) {
                this.onGroundForVisibility.set('hidden');
            }
            else {
                this.onGroundForVisibility.set('visible');
                this.crossHairRef.instance.setAttribute('transform', `translate(${this.sideStickX} ${this.sideStickY})`);
            }
        });
        sub.on('sideStickY').whenChanged().handle(y => {
            this.sideStickY = -y * 23.02;
            const onGround = SimVar.GetSimVarValue('SIM ON GROUND', 'number');
            const oneEngineRunning = SimVar.GetSimVarValue('GENERAL ENG COMBUSTION:1', 'bool') || SimVar.GetSimVarValue('GENERAL ENG COMBUSTION:2', 'bool');
            if (onGround === 0 || !oneEngineRunning) {
                this.onGroundForVisibility.set('hidden');
            }
            else {
                this.onGroundForVisibility.set('visible');
                this.crossHairRef.instance.setAttribute('transform', `translate(${this.sideStickX} ${this.sideStickY})`);
            }
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { id: "GroundCursorGroup", class: "NormalStroke White", visibility: this.onGroundForVisibility },
            FSComponent.buildComponent("path", { id: "GroundCursorBorders", d: "m92.327 103.75h6.0441v-6.0476m-58.93 0v6.0476h6.0441m46.842-45.861h6.0441v6.0476m-58.93 0v-6.0476h6.0441" }),
            FSComponent.buildComponent("path", { ref: this.crossHairRef, id: "GroundCursorCrosshair", d: "m73.994 81.579h-4.3316v4.3341m-5.8426-4.3341h4.3316v4.3341m5.8426-5.846h-4.3316v-4.3341m-5.8426 4.3341h4.3316v-4.3341" })));
    }
}
//# sourceMappingURL=AttitudeIndicatorFixed.js.map