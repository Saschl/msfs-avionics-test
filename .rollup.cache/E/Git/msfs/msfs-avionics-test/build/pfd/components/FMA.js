//import { createDeltaTimeCalculator, getSimVar, renderTarget } from '../util.js';
import { DisplayComponent, FSComponent, Subject } from "msfssdk";
import { Arinc429Word } from "../shared/arinc429";
class ShowForSecondsComponent extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.timeout = 0;
        this.modeChangedPathRef = FSComponent.createRef();
        this.displayModeChangedPath = (timeout, cancel = false) => {
            if (cancel) {
                clearTimeout(this.timeout);
                this.modeChangedPathRef.instance.classList.remove('ModeChangedPath');
            }
            else {
                this.modeChangedPathRef.instance.classList.add('ModeChangedPath');
                clearTimeout(this.timeout);
                this.timeout = setTimeout(() => {
                    this.modeChangedPathRef.instance.classList.remove('ModeChangedPath');
                }, timeout);
            }
        };
    }
}
export class FMA extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.isAttExcessive = false;
        this.isAttExcessiveSub = Subject.create(false);
        this.hiddenClassSub = Subject.create('');
        this.roll = new Arinc429Word(0);
        this.pitch = new Arinc429Word(0);
        this.activeLateralMode = 0;
        this.activeVerticalMode = 0;
        this.firstBorderRef = FSComponent.createRef();
        this.secondBorderRef = FSComponent.createRef();
    }
    ;
    attExcessive(pitch, roll) {
        if (!this.isAttExcessive && ((pitch.isNormalOperation() && (-pitch.value > 25 || -pitch.value < -13)) || (roll.isNormalOperation() && Math.abs(roll.value) > 45))) {
            this.isAttExcessive = true;
            return true;
        }
        else if (this.isAttExcessive && pitch.isNormalOperation() && -pitch.value < 22 && -pitch.value > -10 && roll.isNormalOperation() && Math.abs(roll.value) < 40) {
            this.isAttExcessive = false;
            return false;
        }
        return false;
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const fm = this.props.bus.getSubscriber();
        fm.on('roll').handle(r => {
            this.roll = new Arinc429Word(r);
        });
        fm.on('pitch').handle(p => {
            this.pitch = new Arinc429Word(p);
        });
        fm.on('activeLateralMode').whenChanged().handle(activeLateralMode => {
            const isAttExcessive = this.attExcessive(this.pitch, this.roll);
            this.isAttExcessiveSub.set(isAttExcessive);
            const sharedModeActive = activeLateralMode === 32 || activeLateralMode === 33 || activeLateralMode === 34 || (activeLateralMode === 20 && this.activeVerticalMode === 24);
            const BC3Message = getBC3Message(isAttExcessive)[0] !== null;
            const engineMessage = SimVar.GetSimVarValue('L:A32NX_AUTOTHRUST_MODE_MESSAGE', 'enum');
            const AB3Message = (SimVar.GetSimVarValue('L:A32NX_MachPreselVal', 'mach') !== -1
                || SimVar.GetSimVarValue('L:A32NX_SpeedPreselVal', 'knots') !== -1) && BC3Message && engineMessage === 0;
            let secondBorder;
            if (sharedModeActive && !isAttExcessive) {
                secondBorder = '';
            }
            else if (BC3Message) {
                secondBorder = 'm66.241 0.33732v15.766';
            }
            else {
                secondBorder = 'm66.241 0.33732v20.864';
            }
            let firstBorder;
            if (AB3Message && !isAttExcessive) {
                firstBorder = 'm33.117 0.33732v15.766';
            }
            else {
                firstBorder = 'm33.117 0.33732v20.864';
            }
            this.firstBorderRef.instance.setAttribute('d', firstBorder);
            this.secondBorderRef.instance.setAttribute('d', secondBorder);
        });
        fm.on('activeVerticalMode').whenChanged().handle(activeVerticalMode => {
            const isAttExcessive = this.attExcessive(this.pitch, this.roll);
            const sharedModeActive = this.activeLateralMode === 32 || this.activeLateralMode === 33 || this.activeLateralMode === 34 || (this.activeLateralMode === 20 && activeVerticalMode === 24);
            const BC3Message = getBC3Message(isAttExcessive)[0] !== null;
            const engineMessage = SimVar.GetSimVarValue('L:A32NX_AUTOTHRUST_MODE_MESSAGE', 'enum');
            const AB3Message = (SimVar.GetSimVarValue('L:A32NX_MachPreselVal', 'mach') !== -1
                || SimVar.GetSimVarValue('L:A32NX_SpeedPreselVal', 'knots') !== -1) && BC3Message && engineMessage === 0;
            let secondBorder;
            if (sharedModeActive && !isAttExcessive) {
                secondBorder = '';
            }
            else if (BC3Message) {
                secondBorder = 'm66.241 0.33732v15.766';
            }
            else {
                secondBorder = 'm66.241 0.33732v20.864';
            }
            let firstBorder;
            if (AB3Message && !isAttExcessive) {
                firstBorder = 'm33.117 0.33732v15.766';
            }
            else {
                firstBorder = 'm33.117 0.33732v20.864';
            }
            this.hiddenClassSub.set(isAttExcessive ? 'hidden' : 'visible');
            this.firstBorderRef.instance.setAttribute('d', firstBorder);
            this.secondBorderRef.instance.setAttribute('d', secondBorder);
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { id: "FMA" },
            FSComponent.buildComponent("g", { class: "NormalStroke Grey" },
                FSComponent.buildComponent("path", { ref: this.firstBorderRef }),
                FSComponent.buildComponent("path", { ref: this.secondBorderRef }),
                FSComponent.buildComponent("path", { d: "m102.52 0.33732v20.864" }),
                FSComponent.buildComponent("path", { d: "m133.72 0.33732v20.864" })),
            FSComponent.buildComponent(Row1, { bus: this.props.bus, hiddenClassSub: this.hiddenClassSub }),
            FSComponent.buildComponent(Row2, { bus: this.props.bus, hiddenClassSub: this.hiddenClassSub }),
            FSComponent.buildComponent(Row3, { bus: this.props.bus, hiddenClassSub: this.hiddenClassSub, isAttExcessiveSub: this.isAttExcessiveSub })));
    }
}
;
class Row1 extends DisplayComponent {
    render() {
        return FSComponent.buildComponent("g", null,
            FSComponent.buildComponent(A1A2Cell, { bus: this.props.bus }),
            FSComponent.buildComponent(FSComponent.Fragment, null,
                FSComponent.buildComponent(B1Cell, { visibility: this.props.hiddenClassSub, bus: this.props.bus }),
                FSComponent.buildComponent(C1Cell, { visibility: this.props.hiddenClassSub, bus: this.props.bus }),
                FSComponent.buildComponent(D1D2Cell, { visibility: this.props.hiddenClassSub, bus: this.props.bus }),
                FSComponent.buildComponent(BC1Cell, { visibility: this.props.hiddenClassSub, bus: this.props.bus })),
            FSComponent.buildComponent(E1Cell, { bus: this.props.bus }));
    }
}
class Row2 extends DisplayComponent {
    render() {
        return (FSComponent.buildComponent("g", null,
            FSComponent.buildComponent("g", { visibility: this.props.hiddenClassSub },
                FSComponent.buildComponent(B2Cell, { bus: this.props.bus }),
                FSComponent.buildComponent(C2Cell, { bus: this.props.bus })),
            FSComponent.buildComponent(E2Cell, { bus: this.props.bus })));
    }
}
class Row3 extends DisplayComponent {
    render() {
        return (FSComponent.buildComponent("g", null,
            FSComponent.buildComponent(A3Cell, { bus: this.props.bus }),
            FSComponent.buildComponent("g", { visibility: this.props.hiddenClassSub },
                FSComponent.buildComponent(AB3Cell, { bus: this.props.bus }),
                FSComponent.buildComponent(D3Cell, { bus: this.props.bus })),
            FSComponent.buildComponent(BC3Cell, { isAttExcessive: this.props.isAttExcessiveSub }),
            FSComponent.buildComponent(E3Cell, { bus: this.props.bus })));
    }
}
class A1A2Cell extends ShowForSecondsComponent {
    constructor() {
        super(...arguments);
        this.athrModeSub = Subject.create(0);
        this.cellRef = FSComponent.createRef();
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('AThrMode').whenChanged().handle(athrMode => {
            this.athrModeSub.set(athrMode);
            let text = '';
            switch (athrMode) {
                case 1:
                    text =
                        `
                            <path class="NormalStroke White" d="m24.023 1.8143v13.506h-15.048v-13.506z" />
                            <text class="FontMedium MiddleAlign White" x="16.558302" y="6.8888531">MAN</text>
                            <text class="FontMedium MiddleAlign White" x="16.511532" y="14.232082">TOGA</text>
                        `;
                    break;
                case 2:
                    text =
                        `<g>
                            <path class="NormalStroke White" d="m29.776 1.8143v13.506h-26.414v-13.506z" />
                            <text class="FontMedium MiddleAlign White" x="16.558302" y="6.8888531">MAN</text>
                            <text class="FontMedium MiddleAlign White" x="16.511532" y="14.232082">GA SOFT</text>
                        </g>`;
                    break;
                case 3:
                    const FlexTemp = Math.round(SimVar.GetSimVarValue('L:AIRLINER_TO_FLEX_TEMP', 'number'));
                    const FlexText = FlexTemp >= 0 ? (`+${FlexTemp}`) : FlexTemp.toString();
                    text =
                        `<g>
                            <path class="NormalStroke White" d="m31.521 1.8143v13.506h-30.217v-13.506z" />
                            <text class="FontMedium MiddleAlign White" x="16.558302" y="6.8888531">MAN</text>
                            <text class="FontMedium MiddleAlign White" x="16.511532" y="14.232082">
                                <tspan xmlSpace="preserve">FLX  </tspan>
                                <tspan class="Cyan">${FlexText}</tspan>
                            </text>
                        </g>`;
                    break;
                case 4:
                    text =
                        `<g>
                            <path class="NormalStroke White" d="m23.172 1.8143v13.506h-12.99v-13.506z" />
                            <text class="FontMedium MiddleAlign White" x="16.558302" y="6.8888531">MAN</text>
                            <text class="FontMedium MiddleAlign White" x="16.511532" y="14.232082">DTO</text>
                        </g>`;
                    break;
                case 5:
                    text = `<g>
                            <path class="NormalStroke White" d="m23.172 1.8143v13.506h-12.99v-13.506z" />
                            <text class="FontMedium MiddleAlign White" x="16.558302" y="6.8888531">MAN</text>
                            <text class="FontMedium MiddleAlign White" x="16.511532" y="14.232082">MCT</text>
                        </g>`;
                    break;
                case 6:
                    text =
                        `<g>
                            <path class="NormalStroke Amber" d="m23.172 1.8143v13.506h-12.99v-13.506z" />
                            <text class="FontMedium MiddleAlign White" x="16.558302" y="6.8888531">MAN</text>
                            <text class="FontMedium MiddleAlign White" x="16.511532" y="14.232082">THR</text>
                        </g>`;
                    break;
                case 7:
                    text = `<text  class="FontMedium MiddleAlign Green" x="16.158028" y="6.8888531">SPEED</text>`;
                    this.displayModeChangedPath(9000);
                    break;
                case 8:
                    text = `<text  class="FontMedium MiddleAlign Green" x="16.158028" y="6.8888531">MACH</text>`;
                    this.displayModeChangedPath(9000);
                    break;
                case 9:
                    text = `<text  class="FontMedium MiddleAlign Green" x="16.158028" y="6.8888531">THR MCT</text>`;
                    this.displayModeChangedPath(9000);
                    break;
                case 10:
                    text = `<text  class="FontMedium MiddleAlign Green" x="16.158028" y="6.8888531">THR CLB</text>`;
                    this.displayModeChangedPath(9000);
                    break;
                case 11:
                    text = `<text  class="FontMedium MiddleAlign Green" x="16.158028" y="6.8888531">THR LVR</text>`;
                    this.displayModeChangedPath(9000);
                    break;
                case 12:
                    text = `<text  class="FontMedium MiddleAlign Green" x="16.158028" y="6.8888531">THR IDLE</text>`;
                    this.displayModeChangedPath(9000);
                    break;
                case 13:
                    text =
                        `<g>
                            <path class="NormalStroke Amber BlinkInfinite" d="m0.70556 1.8143h30.927v6.0476h-30.927z" />
                            <text class="FontMedium MiddleAlign Green" x="16.158028" y="6.8888531">A.FLOOR</text>
                        </g>`;
                    break;
                case 14:
                    text =
                        `<g>
                            <path class="NormalStroke Amber BlinkInfinite" d="m0.70556 1.8143h30.927v6.0476h-30.927z" />
                            <text class="FontMedium MiddleAlign Green" x="16.158028" y="6.8888531">TOGA LK</text>
                        </g>`;
                    break;
                default:
                    text = '';
            }
            this.cellRef.instance.innerHTML = text;
            if (text === '') {
                this.displayModeChangedPath(0, true);
            }
        });
    }
    render() {
        return (FSComponent.buildComponent(FSComponent.Fragment, null,
            FSComponent.buildComponent("path", { ref: this.modeChangedPathRef, visibility: 'hidden', class: "NormalStroke White", d: "m0.70556 1.8143h30.927v6.0476h-30.927z" }),
            FSComponent.buildComponent("g", { ref: this.cellRef })));
    }
}
class A3Cell extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.classSub = Subject.create('');
        this.textSub = Subject.create('');
    }
    onUpdateAthrModeMessage(message) {
        let text = '';
        let className = '';
        switch (message) {
            case 1:
                text = 'THR LK';
                className = 'Amber BlinkInfinite';
                break;
            case 2:
                text = 'LVR TOGA';
                className = 'White BlinkInfinite';
                break;
            case 3:
                text = 'LVR CLB';
                className = 'White BlinkInfinite';
                break;
            case 4:
                text = 'LVR MCT';
                className = 'White BlinkInfinite';
                break;
            case 5:
                text = 'LVR ASYM';
                className = 'Amber';
                break;
        }
        this.textSub.set(text);
        this.classSub.set(`FontMedium MiddleAlign ${className}`);
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('athrModeMessage').whenChanged().handle(m => {
            this.onUpdateAthrModeMessage(m);
        });
    }
    render() {
        return (FSComponent.buildComponent("text", { class: this.classSub, x: "16.511532", y: "21.481768" }, this.textSub));
    }
}
class AB3Cell extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.speedPreselVal = -1;
        this.machPreselVal = -1;
        this.athrModeMessage = 0;
        this.textSub = Subject.create('');
    }
    getText() {
        if (this.athrModeMessage === 0) {
            console.log("speed prese " + this.speedPreselVal);
            console.log("mach prese " + this.machPreselVal);
            if (this.speedPreselVal !== -1 && this.machPreselVal === -1) {
                const text = Math.round(this.speedPreselVal);
                this.textSub.set(`SPEED SEL ${text}`);
            }
            else if (this.machPreselVal !== -1 && this.speedPreselVal === -1) {
                this.textSub.set(`MACH SEL ${this.machPreselVal.toFixed(2)}`);
            }
            else if (this.machPreselVal === -1 && this.speedPreselVal === -1) {
                this.textSub.set('');
            }
        }
        else {
            this.textSub.set('');
        }
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('speedPreselVal').whenChanged().handle(m => {
            this.speedPreselVal = m;
            this.getText();
        });
        sub.on('machPreselVal').whenChanged().handle(m => {
            this.machPreselVal = m;
            this.getText();
        });
        sub.on('athrModeMessage').whenChanged().handle(m => {
            this.athrModeMessage = m;
            this.getText();
        });
    }
    render() {
        return (FSComponent.buildComponent("text", { class: "FontMedium MiddleAlign Cyan", x: "35.275196", y: "21.616354" }, this.textSub));
    }
}
class B1Cell extends ShowForSecondsComponent {
    constructor() {
        super(...arguments);
        this.textSub = Subject.create('V/S');
        this.boxClassSub = Subject.create('');
        this.boxPathStringSub = Subject.create('');
        this.activeVerticalModeSub = Subject.create(0);
        this.inProtectionClassSub = Subject.create('Cyan');
        this.speedProtectionPathRef = FSComponent.createRef();
        this.inModeReversionPathRef = FSComponent.createRef();
        this.fmaTextRef = FSComponent.createRef();
        this.addidionalTextSub = Subject.create('V/S');
    }
    getText(activeVerticalMode) {
        let text;
        let additionalText = '';
        let inProtection = false;
        console.log(activeVerticalMode);
        switch (activeVerticalMode) {
            case 31:
                text = 'G/S';
                break;
            // case 2:
            //     text = 'F-G/S';
            //     break;
            case 30:
                text = 'G/S*';
                break;
            // case 4:
            //     text = 'F-G/S*';
            //     break;
            case 40:
            case 41:
                text = 'SRS';
                break;
            case 50:
                text = 'TCAS';
                break;
            // case 9:
            //     text = 'FINAL';
            //     break;
            case 23:
                text = 'DES';
                break;
            case 13:
                if (SimVar.GetSimVarValue('L:A32NX_FMA_EXPEDITE_MODE', 'bool')) {
                    text = 'EXP DES';
                }
                else {
                    text = 'OP DES';
                }
                break;
            case 22:
                text = 'CLB';
                break;
            case 12:
                if (SimVar.GetSimVarValue('L:A32NX_FMA_EXPEDITE_MODE', 'bool')) {
                    text = 'EXP CLB';
                }
                else {
                    text = 'OP CLB';
                }
                break;
            case 10:
                if (SimVar.GetSimVarValue('L:A32NX_FMA_CRUISE_ALT_MODE', 'Bool')) {
                    text = 'ALT CRZ';
                }
                else {
                    text = 'ALT';
                }
                break;
            case 11:
                text = 'ALT*';
                break;
            case 21:
                text = 'ALT CST*';
                break;
            case 20:
                text = 'ALT CST';
                break;
            // case 18:
            //     text = 'ALT CRZ';
            //     break;
            case 15: {
                const FPA = SimVar.GetSimVarValue('L:A32NX_AUTOPILOT_FPA_SELECTED', 'Degree');
                inProtection = SimVar.GetSimVarValue('L:A32NX_FMA_SPEED_PROTECTION_MODE', 'bool');
                const FPAText = `${(FPA >= 0 ? '+' : '')}${(Math.round(FPA * 10) / 10).toFixed(1)}°`;
                text = 'FPA';
                additionalText = FPAText;
                break;
            }
            case 14: {
                const VS = SimVar.GetSimVarValue('L:A32NX_AUTOPILOT_VS_SELECTED', 'feet per minute');
                inProtection = SimVar.GetSimVarValue('L:A32NX_FMA_SPEED_PROTECTION_MODE', 'bool');
                const VSText = `${(VS >= 0 ? '+' : '')}${Math.round(VS).toString()}`.padStart(5, ' ');
                text = 'V/S';
                additionalText = VSText;
                break;
            }
            default:
                text = '';
        }
        const inSpeedProtection = inProtection && (activeVerticalMode === 14 || activeVerticalMode === 15);
        if (inSpeedProtection) {
            this.speedProtectionPathRef.instance.setAttribute('visibility', 'visible');
        }
        else {
            this.speedProtectionPathRef.instance.setAttribute('visibility', 'hidden');
        }
        //DONE 
        /*        if(inModeReversion) {
                   this.inModeReversionPathRef.instance.setAttribute('visibility','visible');
               } else {
                   this.inModeReversionPathRef.instance.setAttribute('visibility','hidden');
               } */
        const tcasModeDisarmedMessage = SimVar.GetSimVarValue('L:A32NX_AUTOPILOT_TCAS_MESSAGE_DISARM', 'bool');
        const boxclass = inSpeedProtection ? 'NormalStroke None' : 'NormalStroke White';
        this.boxClassSub.set(boxclass);
        const boxPathString = activeVerticalMode === 50 && tcasModeDisarmedMessage ? 'm34.656 1.8143h29.918v13.506h-29.918z' : 'm34.656 1.8143h29.918v6.0476h-29.918z';
        this.boxPathStringSub.set(boxPathString);
        this.textSub.set(text);
        this.addidionalTextSub.set(additionalText);
        //console.log(text);
        //console.log(additionalText);
        this.inProtectionClassSub.set(inProtection ? 'PulseCyanFill' : 'Cyan');
        this.fmaTextRef.instance.innerHTML = `<tspan>${text}</tspan><tspan class=${inProtection ? 'PulseCyanFill' : 'Cyan'}>${additionalText}</tspan>`;
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('activeVerticalMode').whenChanged().handle(activeVerticalModem => {
            this.activeVerticalModeSub.set(activeVerticalModem);
            this.getText(activeVerticalModem);
            this.displayModeChangedPath(10000);
        });
        sub.on('ap_vs_selected').whenChanged().handle(svs => {
            //FIXME use the svs instead of getSimvar again
            this.getText(this.activeVerticalModeSub.get());
            this.displayModeChangedPath(10000);
        });
        sub.on('fma_mode_reversion').whenChanged().handle(r => {
            this.displayModeChangedPath(10000);
            if (r) {
                this.inModeReversionPathRef.instance.setAttribute('visibility', 'visible');
                this.boxClassSub.set('NormalStroke None');
            }
            else {
                this.inModeReversionPathRef.instance.setAttribute('visibility', 'hidden');
                this.boxClassSub.set('NormalStroke White');
            }
        });
        sub.on('fma_speed_protection').whenChanged().handle(protection => {
            this.displayModeChangedPath(10000);
            if (!protection) {
                this.speedProtectionPathRef.instance.setAttribute('visibility', 'hidden');
            }
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { visibility: this.props.visibility },
            FSComponent.buildComponent("path", { ref: this.modeChangedPathRef, class: this.boxClassSub, visibility: 'hidden', d: this.boxPathStringSub }),
            FSComponent.buildComponent("path", { ref: this.speedProtectionPathRef, class: "NormalStroke Amber BlinkInfinite", d: "m34.656 1.8143h29.918v6.0476h-29.918z" }),
            FSComponent.buildComponent("path", { ref: this.inModeReversionPathRef, class: "NormalStroke White BlinkInfinite", d: "m34.656 1.8143h29.918v6.0476h-29.918z" }),
            FSComponent.buildComponent("text", { ref: this.fmaTextRef, class: "FontMedium MiddleAlign Green", x: "49.498924", y: "6.8785663" })));
    }
}
;
class B2Cell extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.text1Sub = Subject.create('');
        this.text2Sub = Subject.create('');
        this.classSub = Subject.create('');
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('fmaVerticalArmed').whenChanged().handle(fmv => {
            const altArmed = (fmv >> 0) & 1;
            const altCstArmed = (fmv >> 1) & 1;
            const clbArmed = (fmv >> 2) & 1;
            const desArmed = (fmv >> 3) & 1;
            const gsArmed = (fmv >> 4) & 1;
            const finalArmed = (fmv >> 5) & 1;
            let text1;
            let color1 = 'Cyan';
            if (clbArmed) {
                text1 = 'CLB';
            }
            else if (desArmed) {
                text1 = 'DES';
            }
            else if (altCstArmed) {
                text1 = 'ALT';
                color1 = 'Magenta';
            }
            else if (altArmed) {
                text1 = 'ALT';
            }
            else {
                text1 = '';
            }
            let text2;
            // case 1:
            //     text2 = 'F-G/S';
            //     break;
            if (gsArmed) {
                text2 = 'G/S';
            }
            else if (finalArmed) {
                text2 = 'FINAL';
            }
            else {
                text2 = '';
            }
            this.text1Sub.set(text1);
            this.text2Sub.set(text2);
            this.classSub.set(`FontMedium MiddleAlign ${color1}`);
        });
    }
    render() {
        return (FSComponent.buildComponent("g", null,
            FSComponent.buildComponent("text", { class: this.classSub, x: "40.520622", y: "14.130308" }, this.text1Sub),
            FSComponent.buildComponent("text", { class: "FontMedium MiddleAlign Cyan", x: "55.275803", y: "14.143736" }, this.text2Sub)));
    }
}
class C1Cell extends ShowForSecondsComponent {
    constructor() {
        super(...arguments);
        this.textSub = Subject.create('');
        this.idSub = Subject.create(0);
        this.activeLateralMode = 0;
        this.activeVerticalMode = 0;
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('activeLateralMode').whenChanged().handle(lm => {
            this.activeLateralMode = lm;
            this.updateText(lm, this.activeVerticalMode);
            this.displayModeChangedPath(10000);
        });
        sub.on('activeVerticalMode').whenChanged().handle(lm => {
            this.activeVerticalMode = lm;
            this.updateText(this.activeLateralMode, lm);
            this.displayModeChangedPath(10000);
        });
    }
    updateText(activeLateralMode, activeVerticalMode) {
        const armedVerticalBitmask = SimVar.GetSimVarValue('L:A32NX_FMA_VERTICAL_ARMED', 'number');
        const finalArmed = (armedVerticalBitmask >> 5) & 1;
        let text;
        let id = 0;
        if (activeLateralMode === 50) {
            text = 'GA TRK';
            id = 1;
        }
        else if (activeLateralMode === 30) {
            text = 'LOC *';
            id = 3;
        }
        else if (activeLateralMode === 10) {
            text = 'HDG';
            id = 5;
        }
        else if (activeLateralMode === 40) {
            text = 'RWY';
            id = 6;
        }
        else if (activeLateralMode === 41) {
            text = 'RWY TRK';
            id = 7;
        }
        else if (activeLateralMode === 11) {
            text = 'TRACK';
            id = 8;
        }
        else if (activeLateralMode === 31) {
            text = 'LOC';
            id = 10;
        }
        else if (activeLateralMode === 20 && !finalArmed && activeVerticalMode !== 24) {
            text = 'NAV';
            id = 13;
        }
        else if (activeLateralMode === 20 && finalArmed && activeVerticalMode !== 24) {
            text = 'APP NAV';
            id = 12;
        }
        else {
            text = '';
        }
        this.textSub.set(text);
        this.idSub.set(id);
    }
    render() {
        // case 2:
        //     text = 'LOC B/C*';
        //     id = 2;
        //     break;
        // case 4:
        //     text = 'F-LOC*';
        //     id = 4;
        //     break;
        // case 9:
        //     text = 'LOC B/C';
        //     id = 9;
        //     break;
        // case 11:
        //     text = 'F-LOC';
        //     id = 11;
        //     break;
        // case 12:
        //     text = 'APP NAV';
        //     id = 12;
        //     break;
        return (FSComponent.buildComponent("g", { visibility: this.props.visibility },
            FSComponent.buildComponent("path", { ref: this.modeChangedPathRef, class: "NormalStroke White", visibility: 'hidden', d: "m100.87 1.8143v6.0476h-33.075l1e-6 -6.0476z" }),
            FSComponent.buildComponent("text", { class: "FontMedium MiddleAlign Green", x: "84.490074", y: "6.9027362" }, this.textSub)));
    }
}
class C2Cell extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.fmaLateralArmed = 0;
        this.fmaVerticalArmed = 0;
        this.activeVerticalMode = 0;
        this.textSub = Subject.create('');
    }
    getText() {
        const navArmed = (this.fmaLateralArmed >> 0) & 1;
        const locArmed = (this.fmaLateralArmed >> 1) & 1;
        const finalArmed = (this.fmaVerticalArmed >> 5) & 1;
        let text = '';
        if (locArmed) {
            // case 1:
            //     text = 'LOC B/C';
            //     break;
            text = 'LOC';
            // case 3:
            //     text = 'F-LOC';
            //     break;
        }
        else if (navArmed && (finalArmed || this.activeVerticalMode === 24)) {
            text = 'APP NAV';
        }
        else if (navArmed) {
            text = 'NAV';
        }
        this.textSub.set(text);
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('fmaLateralArmed').whenChanged().handle(fla => {
            this.fmaLateralArmed = fla;
            this.getText();
        });
        sub.on('fmaVerticalArmed').whenChanged().handle(fva => {
            this.fmaVerticalArmed = fva;
            this.getText();
        });
        sub.on('activeVerticalMode').whenChanged().handle(avm => {
            this.activeVerticalMode = avm;
            this.getText();
        });
    }
    render() {
        return (FSComponent.buildComponent("text", { class: "FontMedium MiddleAlign Cyan", x: "84.536842", y: "14.130308" }, this.textSub));
    }
}
;
class BC1Cell extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.modeChangedPathRef = FSComponent.createRef();
        this.timeout = 0;
        this.lastLateralMode = 0;
        this.lastVerticalMode = 0;
        this.textSub = Subject.create('');
        this.displayModeChangedPath = (timeout) => {
            this.modeChangedPathRef.instance.classList.add('ModeChangedPath');
            clearTimeout(this.timeout);
            this.timeout = setTimeout(() => {
                this.modeChangedPathRef.instance.classList.remove('ModeChangedPath');
            }, timeout);
        };
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('activeVerticalMode').whenChanged().handle(v => {
            this.lastVerticalMode = v;
            let text;
            let id = 0;
            if (this.lastVerticalMode === 34) {
                text = 'ROLL OUT';
                id = 1;
            }
            else if (this.lastVerticalMode === 33) {
                text = 'FLARE';
                id = 2;
            }
            else if (this.lastVerticalMode === 32) {
                text = 'LAND';
                id = 3;
            }
            else if (this.lastVerticalMode === 24 && this.lastLateralMode === 20) {
                text = 'FINAL APP';
                id = 4;
            }
            else {
                text = '';
            }
            if (text !== '') {
                this.displayModeChangedPath(9000);
            }
            this.textSub.set(text);
        });
        sub.on('activeLateralMode').whenChanged().handle(l => {
            this.lastLateralMode = l;
            let text;
            let id = 0;
            if (this.lastVerticalMode === 34) {
                text = 'ROLL OUT';
                id = 1;
            }
            else if (this.lastVerticalMode === 33) {
                text = 'FLARE';
                id = 2;
            }
            else if (this.lastVerticalMode === 32) {
                text = 'LAND';
                id = 3;
            }
            else if (this.lastVerticalMode === 24 && this.lastLateralMode === 20) {
                text = 'FINAL APP';
                id = 4;
            }
            else {
                text = '';
            }
            if (text !== '') {
                this.displayModeChangedPath(9000);
            }
            this.textSub.set(text);
        });
    }
    render() {
        return (FSComponent.buildComponent("g", null,
            FSComponent.buildComponent("path", { ref: this.modeChangedPathRef, class: "NormalStroke White", visibility: 'hidden', d: "m50.178 1.8143h35.174v6.0476h-35.174z" }),
            FSComponent.buildComponent("text", { class: "FontMedium MiddleAlign Green", x: "67.9795", y: "6.8893085" }, this.textSub)));
    }
}
const getBC3Message = (isAttExcessive) => {
    const armedVerticalBitmask = SimVar.GetSimVarValue('L:A32NX_FMA_VERTICAL_ARMED', 'number');
    const TCASArmed = (armedVerticalBitmask >> 6) & 1;
    const trkFpaDeselectedTCAS = SimVar.GetSimVarValue('L:A32NX_AUTOPILOT_TCAS_MESSAGE_TRK_FPA_DESELECTION', 'bool');
    const tcasRaInhibited = SimVar.GetSimVarValue('L:A32NX_AUTOPILOT_TCAS_MESSAGE_RA_INHIBITED', 'bool');
    let text;
    let className;
    // All currently unused message are set to false
    if (false) {
        text = 'MAN PITCH TRIM ONLY';
        className = 'Red Blink9Seconds';
    }
    else if (false) {
        text = 'USE MAN PITCH TRIM';
        className = 'PulseAmber9Seconds Amber';
    }
    else if (false) {
        text = 'FOR GA: SET TOGA';
        className = 'PulseAmber9Seconds Amber';
    }
    else if (TCASArmed && !isAttExcessive) {
        text = '  TCAS                ';
        className = 'Cyan';
    }
    else if (false) {
        text = 'DISCONNECT AP FOR LDG';
        className = 'PulseAmber9Seconds Amber';
    }
    else if (tcasRaInhibited && !isAttExcessive) {
        text = 'TCAS RA INHIBITED';
        className = 'White';
    }
    else if (trkFpaDeselectedTCAS && !isAttExcessive) {
        text = 'TRK FPA DESELECTED';
        className = 'White';
    }
    else if (false) {
        text = 'SET GREEN DOT SPEED';
        className = 'White';
    }
    else if (false) {
        text = 'T/D REACHED';
        className = 'White';
    }
    else if (false) {
        text = 'MORE DRAG';
        className = 'White';
    }
    else if (false) {
        text = 'CHECK SPEED MODE';
        className = 'White';
    }
    else if (false) {
        text = 'CHECK APPR SELECTION';
        className = 'White';
    }
    else if (false) {
        text = 'TURN AREA EXCEEDANCE';
        className = 'White';
    }
    else if (false) {
        text = 'SET HOLD SPEED';
        className = 'White';
    }
    else if (false) {
        text = 'VERT DISCONT AHEAD';
        className = 'Amber';
    }
    else if (false) {
        text = 'FINAL APP SELECTED';
        className = 'White';
    }
    else {
        return [null, null];
    }
    return [text, className];
};
class BC3Cell extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.textSub = Subject.create('');
        this.classNameSub = Subject.create('');
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        this.props.isAttExcessive.sub(e => {
            const [text, className] = getBC3Message(e);
            this.classNameSub.set(`FontMedium MiddleAlign ${className}`);
            if (text !== null) {
                this.textSub.set(text);
            }
        });
    }
    render() {
        return (FSComponent.buildComponent("text", { class: this.classNameSub, x: "67.801949", y: "21.481308", xmlSpace: "preserve" }, this.textSub));
    }
}
class D1D2Cell extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.text1Sub = Subject.create('');
        this.text2Sub = Subject.create('');
        this.modeChangedPathRef = FSComponent.createRef();
        this.timeout = 0;
        this.displayModeChangedPath = (timeout) => {
            this.modeChangedPathRef.instance.classList.add('ModeChangedPath');
            clearTimeout(this.timeout);
            this.timeout = setTimeout(() => {
                this.modeChangedPathRef.instance.classList.remove('ModeChangedPath');
            }, timeout);
        };
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const bus = this.props.bus.getSubscriber();
        bus.on('approachCapability').whenChanged().handle(c => {
            let text1;
            let text2;
            switch (c) {
                case 1:
                    text1 = 'CAT1';
                    break;
                case 2:
                    text1 = 'CAT2';
                    break;
                case 3:
                    text1 = 'CAT3';
                    text2 = 'SINGLE';
                    break;
                case 4:
                    text1 = 'CAT3';
                    text2 = 'DUAL';
                    break;
                case 5:
                    text1 = 'AUTO';
                    text2 = 'LAND';
                    break;
                case 6:
                    text1 = 'F-APP';
                    break;
                case 7:
                    text1 = 'F-APP';
                    text2 = '+ RAW';
                    break;
                case 8:
                    text1 = 'RAW';
                    text2 = 'ONLY';
                    break;
                default:
                    text1 = '';
            }
            const box = text2 ? FSComponent.buildComponent("path", { class: "NormalStroke White", d: "m104.1 1.8143h27.994v13.506h-27.994z" })
                : FSComponent.buildComponent("path", { class: "NormalStroke White", d: "m104.1 1.8143h27.994v6.0476h-27.994z" });
            this.text1Sub.set(text1);
            if (text2) {
                this.text2Sub.set(text2);
                this.modeChangedPathRef.instance.setAttribute('d', 'm104.1 1.8143h27.994v13.506h-27.994z');
            }
            else {
                this.modeChangedPathRef.instance.setAttribute('d', 'm104.1 1.8143h27.994v6.0476h-27.994z');
            }
            this.displayModeChangedPath(9000);
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { visibility: this.props.visibility },
            FSComponent.buildComponent("text", { class: "FontMedium MiddleAlign White", x: "118.09216", y: "7.0131598" }, this.text1Sub),
            FSComponent.buildComponent("text", { class: "FontMedium MiddleAlign White", x: "118.15831", y: "14.130308" }, this.text2Sub),
            FSComponent.buildComponent("path", { ref: this.modeChangedPathRef, class: "NormalStroke White", visibility: 'hidden' })));
    }
}
;
class D3Cell extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.textRef = FSComponent.createRef();
        this.classNameSub = Subject.create('');
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('mda').whenChanged().handle(mda => {
            if (mda !== 0) {
                const MDAText = Math.round(mda).toString().padStart(6, ' ');
                this.textRef.instance.innerHTML = `<tspan>BARO</tspan>
                        <tspan class="Cyan" xmlSpace="preserve">${MDAText}</tspan>`;
            }
        });
        sub.on('dh').whenChanged().handle(dh => {
            let fontSize = 'FontSmallest';
            if (dh !== -1 && dh !== -2) {
                const DHText = Math.round(dh).toString().padStart(4, ' ');
                this.textRef.instance.innerHTML = `
                        <tspan>RADIO</tspan>
                        <tspan class="Cyan" xmlSpace="preserve">${DHText}</tspan>
                    `;
            }
            else if (dh === -2) {
                this.textRef.instance.innerHTML = '<tspan>NO DH</tspan>';
                fontSize = 'FontMedium';
            }
            else {
                this.textRef.instance.innerHTML = '';
            }
            this.classNameSub.set(`${fontSize} MiddleAlign White`);
        });
    }
    render() {
        return (FSComponent.buildComponent("text", { ref: this.textRef, class: this.classNameSub, x: "118.1583", y: "21.188744" }));
    }
}
class E1Cell extends ShowForSecondsComponent {
    constructor() {
        super(...arguments);
        this.ap1Active = false;
        this.ap2Active = false;
        this.textSub = Subject.create('');
    }
    setText() {
        let text;
        let id = 0;
        if (this.ap1Active && !this.ap2Active) {
            text = 'AP1';
            id = 1;
        }
        else if (this.ap2Active && !this.ap1Active) {
            text = 'AP2';
            id = 2;
        }
        else if (!this.ap2Active && !this.ap1Active) {
            text = '';
        }
        else {
            text = 'AP1+2';
            id = 3;
        }
        this.textSub.set(text);
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('ap1Active').whenChanged().handle(ap => {
            this.ap1Active = ap;
            this.displayModeChangedPath(9000);
            this.setText();
        });
        sub.on('ap2Active').whenChanged().handle(ap => {
            this.ap2Active = ap;
            this.displayModeChangedPath(9000);
            this.setText();
        });
    }
    render() {
        return (FSComponent.buildComponent("g", null,
            FSComponent.buildComponent("path", { ref: this.modeChangedPathRef, visibility: 'hidden', class: "NormalStroke White", d: "m156.13 1.8143v6.0476h-20.81v-6.0476z" }),
            FSComponent.buildComponent("text", { class: "FontMedium MiddleAlign White", x: "145.61546", y: "6.9559975" }, this.textSub)));
    }
}
class E2Cell extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.fd1Active = false;
        this.fd2Active = false;
        this.ap1Active = false;
        this.ap2Active = false;
        this.textSub = Subject.create('');
    }
    getText() {
        if (!this.ap1Active && !this.ap2Active && !this.fd1Active && !this.fd2Active) {
            console.log("END ME");
            this.textSub.set('');
        }
        else {
            const text = `${this.fd1Active ? '1' : '-'} FD ${this.fd2Active ? '2' : '-'}`;
            this.textSub.set(text);
        }
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('fd1Active').whenChanged().handle(fd => {
            console.log("FD 1" + fd);
            this.fd1Active = fd;
            this.getText();
        });
        sub.on('ap1Active').whenChanged().handle(fd => {
            this.ap1Active = fd;
            this.getText();
        });
        sub.on('ap2Active').whenChanged().handle(fd => {
            this.ap2Active = fd;
            this.getText();
        });
        sub.on('fd2Active').whenChanged().handle(fd => {
            this.fd2Active = fd;
            this.getText();
        });
    }
    render() {
        return (FSComponent.buildComponent("text", { class: "FontMedium MiddleAlign White", x: "145.8961", y: "14.218581" }, this.textSub));
    }
}
class E3Cell extends ShowForSecondsComponent {
    constructor() {
        super(...arguments);
        this.classSub = Subject.create('');
    }
    getClass(athrStatus) {
        let color = '';
        switch (athrStatus) {
            case 1:
                color = 'Cyan';
                break;
            case 2:
                color = 'White';
                break;
        }
        this.classSub.set(`FontMedium MiddleAlign ${color}`);
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('athrStatus').whenChanged().handle(a => {
            this.getClass(a);
            this.displayModeChangedPath(9000);
        });
    }
    render() {
        return (FSComponent.buildComponent("g", null,
            FSComponent.buildComponent("path", { ref: this.modeChangedPathRef, class: "NormalStroke White", visibility: 'hidden', d: "m135.32 16.329h20.81v6.0476h-20.81z" }),
            FSComponent.buildComponent("text", { class: this.classSub, x: "145.75578", y: "21.434536" }, "A/THR")));
    }
}
;
//# sourceMappingURL=FMA.js.map