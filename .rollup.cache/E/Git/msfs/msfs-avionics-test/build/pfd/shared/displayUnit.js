import { DisplayComponent, FSComponent, Subject } from 'msfssdk';
import './common.scss';
var DisplayUnitState;
(function (DisplayUnitState) {
    DisplayUnitState[DisplayUnitState["On"] = 0] = "On";
    DisplayUnitState[DisplayUnitState["Off"] = 1] = "Off";
    DisplayUnitState[DisplayUnitState["Selftest"] = 2] = "Selftest";
    DisplayUnitState[DisplayUnitState["Standby"] = 3] = "Standby";
})(DisplayUnitState || (DisplayUnitState = {}));
export class DisplayUnit extends DisplayComponent {
    constructor(props) {
        super(props);
        // FIXME obvious
        this.state = Subject.create(DisplayUnitState.Off); // this.props.coldDark ? DisplayUnitState.Off : DisplayUnitState.Standby;
        this.electricityState = 0;
        this.potentiometer = 0;
        this.timeOut = 0;
        this.selfTestRef = FSComponent.createRef();
        this.pfdRef = FSComponent.createRef();
        this.simvarPublisher = this.props.bus.getSubscriber();
        //const consumer = subscriber.on('elec');
        //this.electricityState = ConsumerSubject.create(consumer, 0);
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        //this.updateState();
        console.log("RENDER DONE");
        this.simvarPublisher.on('potentiometer_captain').whenChanged().handle(value => {
            this.potentiometer = value;
            this.updateState();
        });
        this.simvarPublisher.on('elec').whenChanged().handle(value => {
            this.electricityState = value;
            this.updateState();
        });
        this.state.sub(v => {
            if (v === DisplayUnitState.Selftest) {
                this.selfTestRef.instance.setAttribute('visibility', 'visible');
            }
            else {
                this.selfTestRef.instance.setAttribute('visibility', 'hidden');
                this.pfdRef.instance.setAttribute('visibility', 'visible');
            }
        });
    }
    /*      useUpdate((deltaTime) => {
            if (timer !== null) {
                if (timer > 0) {
                    setTimer(timer - (deltaTime / 1000));
                } else if (state === DisplayUnitState.Standby) {
                    setState(DisplayUnitState.Off);
                    setTimer(null);
                } else if (state === DisplayUnitState.Selftest) {
                    setState(DisplayUnitState.On);
                    setTimer(null);
                }
            }
        }); */
    setTimer(time) {
        console.log("setting timouet");
        this.timeOut = window.setTimeout(() => {
            console.log("firimng timouet");
            if (this.state.get() === DisplayUnitState.Standby) {
                this.state.set(DisplayUnitState.Off);
            }
            if (this.state.get() === DisplayUnitState.Selftest) {
                this.state.set(DisplayUnitState.On);
            }
        }, time * 1000);
    }
    updateState() {
        if (this.state.get() !== DisplayUnitState.Off && this.props.failed) {
            this.state.set(DisplayUnitState.Off);
        }
        else if (this.state.get() === DisplayUnitState.On && (this.potentiometer === 0 || this.electricityState === 0)) {
            this.state.set(DisplayUnitState.Standby);
            this.setTimer(10);
        }
        else if (this.state.get() === DisplayUnitState.Standby && (this.potentiometer !== 0 && this.electricityState !== 0)) {
            this.state.set(DisplayUnitState.On);
            // setTimer(null);
            clearTimeout(this.timeOut);
        }
        else if (this.state.get() === DisplayUnitState.Off && (this.potentiometer !== 0 && this.electricityState !== 0 && !this.props.failed)) {
            this.state.set(DisplayUnitState.Selftest);
            this.setTimer(15);
            // setTimer(parseInt(NXDataStore.get('CONFIG_SELF_TEST_TIME', '15')));
        }
        else if (this.state.get() === DisplayUnitState.Selftest && (this.potentiometer === 0 || this.electricityState === 0)) {
            this.state.set(DisplayUnitState.Off);
            clearTimeout(this.timeOut);
        }
        console.log(this.state);
    }
    render() {
        return (FSComponent.buildComponent(FSComponent.Fragment, null,
            FSComponent.buildComponent("div", { class: "BacklightBleed" }),
            FSComponent.buildComponent("svg", { ref: this.selfTestRef, class: "SelfTest", viewBox: "0 0 600 600" },
                FSComponent.buildComponent("rect", { class: "SelfTestBackground", x: "0", y: "0", width: "100%", height: "100%" }),
                FSComponent.buildComponent("text", { class: "SelfTestText", x: "50%", y: "50%" }, "SELF TEST IN PROGRESS"),
                FSComponent.buildComponent("text", { class: "SelfTestText", x: "50%", y: "56%" }, "(MAX 40 SECONDS)")),
            FSComponent.buildComponent("div", { style: 'block', ref: this.pfdRef, visibility: 'hidden' }, this.props.children)));
        /*    return (
           <svg class="dcdu-lines">
           <g>
               <path d="m 21 236 h 450" />
               <path d="m 130 246 v 124" />
               <path d="m 362 246 v 124" />
           </g>
       </svg>); */
    }
}
;
//# sourceMappingURL=displayUnit.js.map