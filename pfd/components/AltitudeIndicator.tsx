import { VerticalTape } from './PFDUtils';
import { DisplayComponent, EventBus, FSComponent, Subject, Subscribable, VNode } from 'msfssdk';
import { PFDSimvars, PFDVars } from '../shared/PFDSimvarPublisher';
import { Arinc429Word } from '../shared/arinc429';
import { DigitalAltitudeReadout } from './DigitalAltitudeReadout';

const DisplayRange = 570;
const ValueSpacing = 100;
const DistanceSpacing = 7.5;



interface LandingElevationIndicatorProps {
    altitude: Arinc429Word;
    FWCFlightPhase: number;
    bus: EventBus;
}

/* const LandingElevationIndicator = ({ altitude, FWCFlightPhase }: LandingElevationIndicatorProps) => {
    if (FWCFlightPhase !== 7 && FWCFlightPhase !== 8) {
        return null;
    }

    const landingElevation = getSimVar('C:fs9gps:FlightPlanDestinationAltitude', 'feet');
    const delta = altitude.value - landingElevation;
    if (delta > DisplayRange) {
        return null;
    }
    const offset = (delta - DisplayRange) * DistanceSpacing / ValueSpacing;

    return (
        <path id="AltTapeLandingElevation" class="EarthFill" d={`m130.85 123.56h-13.096v${offset}h13.096z`} />
    );
};
*/
class RadioAltIndicator extends DisplayComponent<{ bus: EventBus }>  {

    private visibilitySub = Subject.create('hidden');
    private offsetSub = Subject.create('hidden');


    onAfterRender(node: VNode): void {
        super.onAfterRender(node);

        const sub = this.props.bus.getSubscriber<PFDSimvars>();

        sub.on('radio_alt').whenChanged().handle(ra => {
            if(ra > DisplayRange) {
                this.visibilitySub.set('hidden');
            } else {
                this.visibilitySub.set('visible');
            }
            const offset = (ra - DisplayRange) * DistanceSpacing / ValueSpacing;

            this.offsetSub.set(`m131.15 123.56h2.8709v${offset}h-2.8709z`);

        });


    }

    render(): VNode {
     
    
        return (
            <path visibility={this.visibilitySub} id="AltTapeGroundReference" class="Fill Red" d={this.offsetSub} />
        );
    }
};
 
/* class GraduationElement extends DisplayComponent<{alt:number, offset:number}> {

    render(): VNode {

        let text = '';
        let isText = true;
        if (this.props.alt % 500 === 0) {
            isText = true;
            text = (Math.abs(this.props.alt) / 100).toString().padStart(3, '0');
        }
    
        return (
            <g transform={`translate(0 ${this.props.offset})`}>
                
                <path class="NormalStroke White" d="m115.79 81.889 1.3316-1.0783-1.3316-1.0783" />
                <path class="NormalStroke White" d="m130.85 80.819h-2.0147" />
                <text class="FontMedium MiddleAlign White" x="122.98842" y="82.939713">{text}</text>
            </g>
        );
    }
 
}; */

interface AltitudeIndicatorProps {
    //altitude: Arinc429Word;
   // FWCFlightPhase: number;
    bus: EventBus;
}

export class AltitudeIndicator extends DisplayComponent<AltitudeIndicatorProps> {

    private subscribable = Subject.create<number>(0);
  
    onAfterRender(node: VNode): void {
        super.onAfterRender(node);

        console.log("RENDER ALTITUDEINDICATOR");
        const pf = this.props.bus.getSubscriber<PFDSimvars>();

        pf.on('altitude').handle(a => {
            this.subscribable.set(a);
        })
    }

    render(): VNode {
/*         if (!altitude.isNormalOperation()) {
            return (
                <AltTapeBackground />
            );
        } */
    

        return (
            <g>
                <AltTapeBackground />
    {/*             <LandingElevationIndicator altitude={altitude} FWCFlightPhase={FWCFlightPhase} /> */} 
                <VerticalTape
                    bugs={[]}
                    displayRange={DisplayRange + 30}
                    valueSpacing={ValueSpacing}
                    distanceSpacing={DistanceSpacing}
                    lowerLimit={-1500}
                    upperLimit={50000}
                    tapeValue={this.subscribable}
                    type='altitude'
                />
            </g>
        );
    
    }

};

class AltTapeBackground extends DisplayComponent<any> {
    render(): VNode {
       return (<path id="AltTapeBackground" d="m130.85 123.56h-13.096v-85.473h13.096z" class="TapeBackground" />);
    }

}
    


 interface AltitudeIndicatorOfftapeProps {

    mode: '' | 'STD' | 'QFE' | 'QNH';
    bus: EventBus;
}

export class AltitudeIndicatorOfftape extends DisplayComponent<AltitudeIndicatorOfftapeProps>  {
    render(): VNode {
    
    return (

       /*  if (!altitude.isNormalOperation()) {
            return (
                <>
                    <path id="AltTapeOutline" class="NormalStroke Red" d="m117.75 123.56h13.096v-85.473h-13.096" />
                    <path id="AltReadoutBackground" class="BlackFill" d="m131.35 85.308h-13.63v-8.9706h13.63z" />
                    <text id="AltFailText" class="Blink9Seconds FontLargest Red EndAlign" x="131.16769" y="83.433167">ALT</text>
                </>
            );
        } */

        <g>
            <path id="AltTapeOutline" class="NormalStroke White" d="m117.75 123.56h17.83m-4.7345-85.473v85.473m-13.096-85.473h17.83" />
          {/*   <LinearDeviationIndicator altitude={altitude} linearDeviation={NaN} />
            <SelectedAltIndicator currentAlt={altitude} targetAlt={targetAlt} altIsManaged={altIsManaged} mode={mode} />
            <AltimeterIndicator mode={mode} altitude={altitude} />
            <MetricAltIndicator altitude={altitude} MDA={MDA} targetAlt={targetAlt} altIsManaged={altIsManaged} /> */}
            <path id="AltReadoutBackground" class="BlackFill" d="m130.85 85.308h-13.13v-8.9706h13.13v-2.671h8.8647v14.313h-8.8647z" />
            <RadioAltIndicator bus={this.props.bus} />
            <DigitalAltitudeReadout bus={this.props.bus} />
        </g>
    )
    
    }
};


/*
interface SelectedAltIndicatorProps {
    currentAlt: Arinc429Word,
    targetAlt: number,
    altIsManaged: boolean,
    mode: '' | 'STD' | 'QFE' | 'QNH';
}

const SelectedAltIndicator = ({ currentAlt, targetAlt, altIsManaged, mode }: SelectedAltIndicatorProps) => {
    const color = altIsManaged ? 'Magenta' : 'Cyan';

    const isSTD = mode === 'STD';
    let boxLength = 19.14;
    let text = '';
    if (isSTD) {
        text = Math.round(targetAlt / 100).toString().padStart(3, '0');
        boxLength = 12.5;
    } else {
        text = Math.round(targetAlt).toString().padStart(5, ' ');
    }

    if (currentAlt.value - targetAlt > DisplayRange) {
        return (
            <g id="SelectedAltLowerGroup">
                <text id="SelectedAltLowerText" class={`FontMedium EndAlign ${color}`} x="135.41222" y="128.90233" xmlSpace="preserve">{text}</text>
                {isSTD
                && <text id="SelectedAltLowerFLText" class={`FontSmall MiddleAlign ${color}`} x="120.83108" y="128.97597">FL</text>}
            </g>
        );
    } if (currentAlt.value - targetAlt < -DisplayRange) {
        return (
            <g id="SelectedAltUpperGroup">
                <text id="SelectedAltUpperText" class={`FontMedium EndAlign ${color}`} x="135.41232" y="37.348804" xmlSpace="preserve">{text}</text>
                {isSTD
                && <text id="SelectedAltUpperFLText" class={`FontSmall MiddleAlign ${color}`} x="120.83106" y="37.337193">FL</text>}
            </g>
        );
    }
    const offset = (currentAlt.value - targetAlt) * DistanceSpacing / ValueSpacing;

    return (
        <g id="AltTapeTargetSymbol" transform={`translate(0 ${offset})`}>
            <path class="BlackFill" d={`m117.75 77.784h${boxLength}v6.0476h-${boxLength}z`} />
            <path class={`NormalStroke ${color}`} d="m122.79 83.831v6.5516h-7.0514v-8.5675l2.0147-1.0079m4.8441-3.0238v-6.5516h-6.8588v8.5675l2.0147 1.0079" />
            <text id="AltTapeTargetText" class={`FontMedium StartAlign ${color}`} x="118.12846" y="82.867332" xmlSpace="preserve">{text}</text>
        </g>
    );
};

interface LinearDeviationIndicatorProps {
    linearDeviation: number;
    altitude: Arinc429Word;
}

const LinearDeviationIndicator = ({ linearDeviation, altitude }: LinearDeviationIndicatorProps) => {
    if (Number.isNaN(linearDeviation)) {
        return null;
    }
    const circleRadius = 30;
    if (altitude.value - linearDeviation > DisplayRange - circleRadius) {
        return (
            <path id="VDevDotLower" class="Fill Green" d="m116.24 121.85c4.9e-4 0.83465 0.67686 1.511 1.511 1.511 0.83418 0 1.5105-0.67636 1.511-1.511h-1.511z" />
        );
    } if (altitude.value - linearDeviation < -DisplayRange + circleRadius) {
        return (
            <path id="VDevDotUpper" class="Fill Green" d="m116.24 39.8c4.9e-4 -0.83466 0.67686-1.511 1.511-1.511 0.83418 0 1.5105 0.67635 1.511 1.511h-1.511z" />
        );
    }
    const offset = (altitude.value - linearDeviation) * DistanceSpacing / ValueSpacing;

    return (
        <path id="VDevDot" class="Fill Green" transform={`translate(0 ${offset})`} d="m119.26 80.796a1.511 1.5119 0 1 0-3.022 0 1.511 1.5119 0 1 0 3.022 0z" />
    );
};

interface AltimeterIndicatorProps {
    mode: '' | 'STD' | 'QFE' | 'QNH';
    altitude: Arinc429Word,
}

const AltimeterIndicator = ({ mode, altitude }: AltimeterIndicatorProps) => {
    const phase = getSimVar('L:A32NX_FMGC_FLIGHT_PHASE', 'enum');
    const transAlt = getSimVar(phase <= 3 ? 'L:AIRLINER_TRANS_ALT' : 'L:AIRLINER_APPR_TRANS_ALT', 'number');

    if (mode === 'STD') {
        return (
            <g id="STDAltimeterModeGroup" class={(phase > 3 && transAlt > altitude.value && transAlt !== 0) ? 'BlinkInfinite' : ''}>
                <path class="NormalStroke Yellow" d="m124.79 131.74h13.096v7.0556h-13.096z" />
                <text class="FontMedium Cyan AlignLeft" x="125.99706" y="137.20053">STD</text>
            </g>
        );
    }

    const units = Simplane.getPressureSelectedUnits();
    const pressure = Simplane.getPressureValue(units);
    let text: string;
    if (pressure !== null) {
        if (units === 'millibar') {
            text = Math.round(pressure).toString();
        } else {
            text = pressure.toFixed(2);
        }
    } else {
        text = '';
    }

    return (
        <g id="AltimeterGroup" class={(phase <= 3 && transAlt < altitude.value && transAlt !== 0) ? 'BlinkInfinite' : ''}>
            {mode === 'QFE'
            && <path class="NormalStroke White" d="m 116.83686,133.0668 h 13.93811 v 5.8933 h -13.93811 z" />}
            <text id="AltimeterModeText" class="FontMedium White" x="118.29047" y="138.03368">{mode}</text>
            <text id="AltimeterSettingText" class="FontMedium MiddleAlign Cyan" x="140.86115" y="138.03368">{text}</text>
        </g>
    );
};

interface MetricAltIndicatorProps {
    altitude: Arinc429Word;
    MDA: number;
    targetAlt: number;
    altIsManaged: boolean;
}

const MetricAltIndicator = ({ altitude, MDA, targetAlt, altIsManaged }: MetricAltIndicatorProps) => {
    const currentMetricAlt = Math.round(altitude.value * 0.3048 / 10) * 10;

    const targetMetric = Math.round(targetAlt * 0.3048 / 10) * 10;
    const targetAltColor = altIsManaged ? 'Magenta' : 'Cyan';

    const currentMetricAltColor = altitude.value > MDA ? 'Green' : 'Amber';

    const showMetricAlt = getSimVar('L:A32NX_METRIC_ALT_TOGGLE', 'bool');
    if (!showMetricAlt) {
        return null;
    }

    return (
        <g id="MetricAltGroup">
            <path class="NormalStroke Yellow" d="m116.56 140.22h29.213v7.0556h-29.213z" />
            <text class="FontMedium Cyan MiddleAlign" x="141.78165" y="145.69975">M</text>
            <text id="MetricAltText" class={`FontMedium ${currentMetricAltColor} MiddleAlign`} x="128.23189" y="145.80269">{currentMetricAlt}</text>
            <g id="MetricAltTargetGroup">
                <text id="MetricAltTargetText" class={`FontSmallest ${targetAltColor} MiddleAlign`} x="93.670235" y="37.946552">{targetMetric}</text>
                <text class="FontSmallest Cyan MiddleAlign" x="105.15807" y="37.872921">M</text>
            </g>
        </g>
    );
};
 */