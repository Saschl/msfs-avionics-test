import { ComponentProps, ConsumerSubject, DisplayComponent, EventBus, FSComponent, Subscribable, VNode } from "msfssdk";
import { Arinc429Word } from "../shared/arinc429";
import { DisplayUnit } from "../shared/displayUnit";
import { PFDSimvars } from "../shared/PFDSimvarPublisher";
import '../style.scss';
import { AltitudeIndicator, AltitudeIndicatorOfftape } from "./AltitudeIndicator";
import { AttitudeIndicatorFixedCenter, AttitudeIndicatorFixedUpper } from "./AttitudeIndicatorFixed";
import { FMA } from "./FMA";
import { HeadingTape } from "./HeadingIndicator";
import { Horizon } from "./horizon";
import { LandingSystem } from "./LandingSystemIndicator";
import { AirspeedIndicator, AirspeedIndicatorOfftape } from "./SpeedIndicator";
import { VerticalSpeedIndicator } from "./VerticalSpeedIndicator";


interface PFDProps extends ComponentProps {
    bus: EventBus;
    instrument: BaseInstrument;
}

export class PFDComponent extends DisplayComponent<PFDProps> {

    private pitch: Subscribable<number>;


    constructor(props: PFDProps) {
        super(props);

        const subscriber = props.bus.getSubscriber<PFDSimvars>();
        const consumer = subscriber.on('pitch');
        this.pitch = ConsumerSubject.create(consumer, 0);


       
    }
    public onAfterRender(node: VNode): void {
    }

    render(): VNode  {
        return (
            <DisplayUnit
                potentiometerIndex={88}
                failed={false}
                bus={this.props.bus}
            >
                <svg class="pfd-svg" version="1.1" viewBox="0 0 158.75 158.75" xmlns="http://www.w3.org/2000/svg">
                <Horizon
                    bus={this.props.bus}
                    instrument={this.props.instrument}
                        heading={new Arinc429Word(211)}
                        FDActive={true}
                        selectedHeading={222}
                        isOnGround={true}
                        radioAlt={0}
                        decisionHeight={200}
                        isAttExcessive={false}
                    />
                    <path
                        id="Mask1"
                        class="BackgroundFill"
                        // eslint-disable-next-line max-len
                        d="m32.138 101.25c7.4164 13.363 21.492 21.652 36.768 21.652 15.277 0 29.352-8.2886 36.768-21.652v-40.859c-7.4164-13.363-21.492-21.652-36.768-21.652-15.277 0-29.352 8.2886-36.768 21.652zm-32.046 57.498h158.66v-158.75h-158.66z"
                    />
                    <HeadingTape bus={this.props.bus}/>
                    <AltitudeIndicator bus={this.props.bus} />
                    <AirspeedIndicator
                 /*        airspeed={clampedAirspeed}
                        airspeedAcc={filteredAirspeedAcc} */
                      /*   FWCFlightPhase={FlightPhase} */
                     /*    altitude={altitude}
                        VLs={vls}
                        VMax={VMax}
                        showBars={showSpeedBars} */
                        bus={this.props.bus}
                        instrument={this.props.instrument}
                    />
                    <path
                        id="Mask2"
                        class="BackgroundFill"
                        // eslint-disable-next-line max-len
                        d="m32.138 145.34h73.536v10.382h-73.536zm0-44.092c7.4164 13.363 21.492 21.652 36.768 21.652 15.277 0 29.352-8.2886 36.768-21.652v-40.859c-7.4164-13.363-21.492-21.652-36.768-21.652-15.277 0-29.352 8.2886-36.768 21.652zm-32.046 57.498h158.66v-158.75h-158.66zm115.14-35.191v-85.473h15.609v85.473zm-113.33 0v-85.473h27.548v85.473z"
                    />
                   <AirspeedIndicatorOfftape bus={this.props.bus} />


                    <LandingSystem bus={this.props.bus} instrument={this.props.instrument} /> 
                     <AttitudeIndicatorFixedUpper bus={this.props.bus}/> 
                    <AttitudeIndicatorFixedCenter bus={this.props.bus}/>
                    <VerticalSpeedIndicator bus={this.props.bus}/>
                    {/* <HeadingOfftape ILSCourse={ILSCourse} groundTrack={groundTrack} heading={heading} selectedHeading={selectedHeading} /> */}
                     <AltitudeIndicatorOfftape mode='' bus={this.props.bus} /> 
                   
                    
                  {/*   <MachNumber mach={mach} /> */}
                    <FMA bus={this.props.bus} />   
                </svg>
            </DisplayUnit>
        ); 
    }

}