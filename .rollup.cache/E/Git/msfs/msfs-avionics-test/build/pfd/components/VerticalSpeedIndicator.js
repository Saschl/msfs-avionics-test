import { DisplayComponent, FSComponent, Subject } from 'msfssdk';
import { Arinc429Word } from '../shared/arinc429';
export class VerticalSpeedIndicator extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.verticalSpeedSub = Subject.create(new Arinc429Word(0));
        this.yOffsetSub = Subject.create(0);
        this.isAmberSub = Subject.create(-1);
        this.lastIrVerticalSpeed = new Arinc429Word(0);
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('vs_inert').whenChanged().handle(ivs => {
            const arinc = new Arinc429Word(ivs);
            if (arinc.isNormalOperation()) {
                this.verticalSpeedSub.set(arinc);
            }
            this.lastIrVerticalSpeed = arinc;
        });
        sub.on('vs_baro').whenChanged().handle(ivs => {
            const arinc = new Arinc429Word(ivs);
            // When available, the IR V/S has priority over the ADR barometric V/S.
            if (!this.lastIrVerticalSpeed.isNormalOperation()) {
                this.verticalSpeedSub.set(arinc);
            }
        });
        this.verticalSpeedSub.sub(vs => {
            const absVSpeed = Math.abs(vs.value);
            const radioAlt = SimVar.GetSimVarValue('PLANE ALT ABOVE GROUND MINUS CG', 'feet');
            if (absVSpeed > 6000 || (radioAlt < 2500 && radioAlt > 1000 && vs.value < -2000) || (radioAlt < 1000 && vs.value < -1200)) {
                this.isAmberSub.set(1);
            }
            else {
                this.isAmberSub.set(0);
            }
            const sign = Math.sign(vs.value);
            if (absVSpeed < 1000) {
                this.yOffsetSub.set(vs.value / 1000 * -27.22);
            }
            else if (absVSpeed < 2000) {
                this.yOffsetSub.set((vs.value - sign * 1000) / 1000 * -10.1 - sign * 27.22);
            }
            else if (absVSpeed < 6000) {
                this.yOffsetSub.set((vs.value - sign * 2000) / 4000 * -10.1 - sign * 37.32);
            }
            else {
                this.yOffsetSub.set(sign * -47.37);
            }
        });
    }
    render() {
        return (FSComponent.buildComponent("g", null,
            FSComponent.buildComponent("g", { id: 'vsfailed' },
                FSComponent.buildComponent("path", { class: "TapeBackground", d: "m151.84 131.72 4.1301-15.623v-70.556l-4.1301-15.623h-5.5404v101.8z" }),
                FSComponent.buildComponent("g", { id: "VSpeedFailText" },
                    FSComponent.buildComponent("text", { class: "Blink9Seconds FontLargest Red EndAlign", x: "153.13206", y: "77.501472" }, "V"),
                    FSComponent.buildComponent("text", { class: "Blink9Seconds FontLargest Red EndAlign", x: "153.13406", y: "83.211388" }, "/"),
                    FSComponent.buildComponent("text", { class: "Blink9Seconds FontLargest Red EndAlign", x: "152.99374", y: "88.870819" }, "S"))),
            FSComponent.buildComponent("path", { class: "TapeBackground", d: "m151.84 131.72 4.1301-15.623v-70.556l-4.1301-15.623h-5.5404v101.8z" }),
            FSComponent.buildComponent("g", { id: "VerticalSpeedGroup" },
                FSComponent.buildComponent("g", { class: "Fill White" },
                    FSComponent.buildComponent("path", { d: "m149.92 54.339v-1.4615h1.9151v1.4615z" }),
                    FSComponent.buildComponent("path", { d: "m149.92 44.26v-1.4615h1.9151v1.4615z" }),
                    FSComponent.buildComponent("path", { d: "m149.92 34.054v-1.2095h1.9151v1.2095z" }),
                    FSComponent.buildComponent("path", { d: "m151.84 107.31h-1.9151v1.4615h1.9151z" }),
                    FSComponent.buildComponent("path", { d: "m151.84 117.39h-1.9151v1.4615h1.9151z" }),
                    FSComponent.buildComponent("path", { d: "m151.84 127.59h-1.9151v1.2095h1.9151z" })),
                FSComponent.buildComponent("g", { class: "NormalStroke White" },
                    FSComponent.buildComponent("path", { d: "m149.92 67.216h1.7135" }),
                    FSComponent.buildComponent("path", { d: "m151.84 48.569h-1.9151" }),
                    FSComponent.buildComponent("path", { d: "m151.84 38.489h-1.9151" }),
                    FSComponent.buildComponent("path", { d: "m149.92 94.43h1.7135" }),
                    FSComponent.buildComponent("path", { d: "m151.84 113.08h-1.9151" }),
                    FSComponent.buildComponent("path", { d: "m151.84 123.16h-1.9151" })),
                FSComponent.buildComponent("g", { class: "FontSmallest MiddleAlign Fill White" },
                    FSComponent.buildComponent("text", { x: "148.07108", y: "109.72845" }, "1"),
                    FSComponent.buildComponent("text", { x: "148.14471", y: "119.8801" }, "2"),
                    FSComponent.buildComponent("text", { x: "148.07108", y: "129.90607" }, "6"),
                    FSComponent.buildComponent("text", { x: "148.09711", y: "55.316456" }, "1"),
                    FSComponent.buildComponent("text", { x: "148.06529", y: "45.356102" }, "2"),
                    FSComponent.buildComponent("text", { x: "148.11371", y: "35.195072" }, "6")),
                FSComponent.buildComponent("path", { class: "Fill Yellow", d: "m145.79 80.067h6.0476v1.5119h-6.0476z" }),
                FSComponent.buildComponent(VSpeedNeedle, { isAmber: this.isAmberSub, yOffset: this.yOffsetSub }),
                FSComponent.buildComponent(VSpeedText, { yOffset: this.yOffsetSub, isAmber: this.isAmberSub, VSpeed: this.verticalSpeedSub }))));
    }
}
class VSpeedNeedle extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.outLineRef = FSComponent.createRef();
        this.indicatorRef = FSComponent.createRef();
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        this.props.yOffset.sub(offset => {
            this.outLineRef.instance.setAttribute('d', `m162.74 80.822 l -12 ${offset}`);
            this.indicatorRef.instance.setAttribute('d', `m162.74 80.822 l -12 ${offset}`);
        });
        this.props.isAmber.sub(isAmberi => {
            const className = `HugeStroke ${isAmberi === 1 ? 'Amber' : 'Green'}`;
            console.log('le classname ' + className);
            this.indicatorRef.instance.setAttribute('class', className);
        });
    }
    render() {
        return (FSComponent.buildComponent(FSComponent.Fragment, null,
            FSComponent.buildComponent("path", { ref: this.outLineRef, class: "HugeOutline" }),
            FSComponent.buildComponent("path", { ref: this.indicatorRef, id: "VSpeedIndicator" })));
    }
}
class VSpeedText extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.vsTextRef = FSComponent.createRef();
        this.groupRef = FSComponent.createRef();
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        this.props.VSpeed.sub(vs => {
            const absVSpeed = Math.abs(vs.value);
            if (absVSpeed < 200) {
                this.groupRef.instance.setAttribute('visibility', 'hidden');
                return;
            }
            else {
                this.groupRef.instance.setAttribute('visibility', 'visible');
            }
            const sign = Math.sign(vs.value);
            const textOffset = this.props.yOffset.get() - sign * 2.4;
            const text = (Math.round(absVSpeed / 100) < 10 ? '0' : '') + Math.round(absVSpeed / 100).toString();
            this.vsTextRef.instance.textContent = text;
            this.groupRef.instance.setAttribute('transform', `translate(0 ${textOffset})`);
        });
        /*   this.props.yOffset.sub(offset => {
  
          }) */
        this.props.isAmber.sub(isAmber => {
            const className = `FontSmallest MiddleAlign ${isAmber === 1 ? 'Amber' : 'Green'}`;
            this.vsTextRef.instance.setAttribute('class', className);
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { ref: this.groupRef, id: "VSpeedTextGroup" },
            FSComponent.buildComponent("path", { class: "BackgroundFill", d: "m158.4 83.011h-7.0514v-4.3989h7.0514z" }),
            FSComponent.buildComponent("text", { ref: this.vsTextRef, id: "VSpeedText", x: "154.84036", y: "82.554581" })));
    }
}
;
//# sourceMappingURL=VerticalSpeedIndicator.js.map