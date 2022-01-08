import { ConsumerSubject, DisplayComponent, FSComponent } from "msfssdk";
import { Arinc429Word } from "../shared/arinc429";
import { DisplayUnit } from "../shared/displayUnit";
import '../style.scss';
import { AltitudeIndicator, AltitudeIndicatorOfftape } from "./AltitudeIndicator";
import { AttitudeIndicatorFixedCenter, AttitudeIndicatorFixedUpper } from "./AttitudeIndicatorFixed";
import { FMA } from "./FMA";
import { HeadingTape } from "./HeadingIndicator";
import { Horizon } from "./horizon";
import { AirspeedIndicator, AirspeedIndicatorOfftape } from "./SpeedIndicator";
import { VerticalSpeedIndicator } from "./VerticalSpeedIndicator";
export class PFDComponent extends DisplayComponent {
    constructor(props) {
        super(props);
        const subscriber = props.bus.getSubscriber();
        const consumer = subscriber.on('pitch');
        this.pitch = ConsumerSubject.create(consumer, 0);
    }
    onAfterRender(node) {
    }
    render() {
        return (FSComponent.buildComponent(DisplayUnit, { potentiometerIndex: 88, failed: false, bus: this.props.bus },
            FSComponent.buildComponent("svg", { class: "pfd-svg", version: "1.1", viewBox: "0 0 158.75 158.75", xmlns: "http://www.w3.org/2000/svg" },
                FSComponent.buildComponent(Horizon, { bus: this.props.bus, instrument: this.props.instrument, heading: new Arinc429Word(211), FDActive: true, selectedHeading: 222, isOnGround: true, radioAlt: 0, decisionHeight: 200, isAttExcessive: false }),
                FSComponent.buildComponent("path", { id: "Mask1", class: "BackgroundFill", 
                    // eslint-disable-next-line max-len
                    d: "m32.138 101.25c7.4164 13.363 21.492 21.652 36.768 21.652 15.277 0 29.352-8.2886 36.768-21.652v-40.859c-7.4164-13.363-21.492-21.652-36.768-21.652-15.277 0-29.352 8.2886-36.768 21.652zm-32.046 57.498h158.66v-158.75h-158.66z" }),
                FSComponent.buildComponent(HeadingTape, { bus: this.props.bus }),
                FSComponent.buildComponent(AltitudeIndicator, { bus: this.props.bus }),
                FSComponent.buildComponent(AirspeedIndicator
                /*        airspeed={clampedAirspeed}
                       airspeedAcc={filteredAirspeedAcc} */
                /*   FWCFlightPhase={FlightPhase} */
                /*    altitude={altitude}
                   VLs={vls}
                   VMax={VMax}
                   showBars={showSpeedBars} */
                , { 
                    /*        airspeed={clampedAirspeed}
                           airspeedAcc={filteredAirspeedAcc} */
                    /*   FWCFlightPhase={FlightPhase} */
                    /*    altitude={altitude}
                       VLs={vls}
                       VMax={VMax}
                       showBars={showSpeedBars} */
                    bus: this.props.bus, instrument: this.props.instrument }),
                FSComponent.buildComponent("path", { id: "Mask2", class: "BackgroundFill", 
                    // eslint-disable-next-line max-len
                    d: "m32.138 145.34h73.536v10.382h-73.536zm0-44.092c7.4164 13.363 21.492 21.652 36.768 21.652 15.277 0 29.352-8.2886 36.768-21.652v-40.859c-7.4164-13.363-21.492-21.652-36.768-21.652-15.277 0-29.352 8.2886-36.768 21.652zm-32.046 57.498h158.66v-158.75h-158.66zm115.14-35.191v-85.473h15.609v85.473zm-113.33 0v-85.473h27.548v85.473z" }),
                FSComponent.buildComponent(AirspeedIndicatorOfftape, { bus: this.props.bus }),
                FSComponent.buildComponent(AttitudeIndicatorFixedUpper, { bus: this.props.bus }),
                FSComponent.buildComponent(AttitudeIndicatorFixedCenter, { bus: this.props.bus }),
                FSComponent.buildComponent(VerticalSpeedIndicator, { bus: this.props.bus }),
                FSComponent.buildComponent(AltitudeIndicatorOfftape, { mode: '', bus: this.props.bus }),
                FSComponent.buildComponent(FMA, { bus: this.props.bus }))));
    }
}
//# sourceMappingURL=index.js.map