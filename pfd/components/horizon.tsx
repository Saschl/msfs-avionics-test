import { Arinc429Word } from '../shared/arinc429';

import {
    calculateHorizonOffsetFromPitch,
    calculateVerticalOffsetFromRoll,
    HorizontalTape,
    LagFilter,
} from './PFDUtils';
import { DisplayComponent, EventBus, FSComponent, Subject, Subscribable, VNode } from 'msfssdk';
import { PFDSimvars } from '../shared/PFDSimvarPublisher';

const DisplayRange = 35;
const DistanceSpacing = 15;
const ValueSpacing = 10;

class TickFunction extends DisplayComponent<{offset: number}> {

    render(): VNode | null {
        return (<path transform={`translate(${this.props.offset} 0)`} className="NormalStroke White" d="m68.906 80.823v1.8" />)
    }

}

export class HeadingBug  extends DisplayComponent<{offset: number}> {

    render(): VNode | null { 
        return(
        <g id="HorizonHeadingBug" transform={`translate(${this.props.offset} 0)`}>
        <path className="ThickOutline" d="m68.906 80.823v-9.0213" />
        <path className="ThickStroke Cyan" d="m68.906 80.823v-9.0213" />
    </g>)
    }
   
}

interface HorizonProps {
    bus: EventBus;
    instrument: BaseInstrument;
    heading: Arinc429Word;
    isOnGround: boolean;
    radioAlt: number;
    decisionHeight: number;
    selectedHeading: number;
    FDActive: boolean;
    isAttExcessive: boolean;
}




export class Horizon extends DisplayComponent<HorizonProps> {

    private pitchGroupRef = FSComponent.createRef<SVGGElement>();
    private rollGroupRef = FSComponent.createRef<SVGGElement>();

    onAfterRender(node: VNode): void {
        super.onAfterRender(node);

        const pf = this.props.bus.getSubscriber<PFDSimvars>();

        pf.on('pitch').handle(pitch => {

            const newVal = new Arinc429Word(pitch);
            //console.log(newVal.value);

            if(newVal.isNormalOperation()) {
                this.pitchGroupRef.instance.setAttribute('style','display:block')

                this.pitchGroupRef.instance.setAttribute('transform',`translate(0 ${calculateHorizonOffsetFromPitch(-newVal.value)})`)

            } else {
                this.pitchGroupRef.instance.setAttribute('style','display:none')
            }

        });

        pf.on('roll').handle(roll => {
            const newVal = new Arinc429Word(roll);

            if(newVal.isNormalOperation()) {
                this.rollGroupRef.instance.setAttribute('style','display:block')

                this.rollGroupRef.instance.setAttribute('transform',`rotate(${newVal.value} 68.814 80.730)`)
            } else {
                this.rollGroupRef.instance.setAttribute('style','display:none')
            }
          
        })

    }

    render(): VNode {

    
      /*   const yOffset = Math.max(Math.min(calculateHorizonOffsetFromPitch(-this.props.pitch.value), 31.563), -31.563); */
    
        const bugs: [number][] = [];
        if (!Number.isNaN(this.props.selectedHeading) && !this.props.FDActive) {
            bugs.push([this.props.selectedHeading]);
        }
    
        return (
            <g id="RollGroup" ref={this.rollGroupRef} style="display:none">
                <g id="PitchGroup" ref={this.pitchGroupRef}>
                    <path d="m23.906 80.823v-160h90v160z" class="SkyFill" />
                    <path d="m113.91 223.82h-90v-143h90z" class="EarthFill" />
    
                    {/* If you're wondering why some paths have an "h0" appended, it's to work around a
                rendering bug in webkit, where paths with only one line is rendered blurry. */}
    
                    <g class="NormalStroke White">
                        <path d="m66.406 85.323h5h0" />
                        <path d="m64.406 89.823h9h0" />
                        <path d="m66.406 94.073h5h0" />
                        <path d="m59.406 97.823h19h0" />
                        <path d="m64.406 103.82h9h0" />
                        <path d="m59.406 108.82h19h0" />
                        <path d="m55.906 118.82h26h0" />
                        <path d="m52.906 138.82h32h0" />
                        <path d="m47.906 168.82h42h0" />
                        <path d="m66.406 76.323h5h0" />
                        <path d="m64.406 71.823h9h0" />
                        <path d="m66.406 67.323h5h0" />
                        <path d="m59.406 62.823h19h0" />
                        <path d="m66.406 58.323h5h0" />
                        <path d="m64.406 53.823h9h0" />
                        <path d="m66.406 49.323h5h0" />
                        <path d="m59.406 44.823h19h0" />
                        <path d="m66.406 40.573h5h0" />
                        <path d="m64.406 36.823h9h0" />
                        <path d="m66.406 33.573h5h0" />
                        <path d="m55.906 30.823h26h0" />
                        <path d="m52.906 10.823h32h0" />
                        <path d="m47.906-19.177h42h0" />
                    </g>
    
                    <g id="PitchProtUpper" class="NormalStroke Green">
                        <path d="m51.506 31.523h4m-4-1.4h4" />
                        <path d="m86.306 31.523h-4m4-1.4h-4" />
                    </g>
                    <g id="PitchProtLostUpper" style="display: none" class="NormalStroke Amber">
                        <path d="m52.699 30.116 1.4142 1.4142m-1.4142 0 1.4142-1.4142" />
                        <path d="m85.114 31.53-1.4142-1.4142m1.4142 0-1.4142 1.4142" />
                    </g>
                    <g id="PitchProtLower" class="NormalStroke Green">
                        <path d="m59.946 104.52h4m-4-1.4h4" />
                        <path d="m77.867 104.52h-4m4-1.4h-4" />
                    </g>
                    <g id="PitchProtLostLower" style="display: none" class="NormalStroke Amber">
                        <path d="m61.199 103.12 1.4142 1.4142m-1.4142 0 1.4142-1.4142" />
                        <path d="m76.614 104.53-1.4142-1.4142m1.4142 0-1.4142 1.4142" />
                    </g>
    
                    <path d="m68.906 121.82-8.0829 14h2.8868l5.1962-9 5.1962 9h2.8868z" class="NormalStroke Red" />
                    <path d="m57.359 163.82 11.547-20 11.547 20h-4.0414l-7.5056-13-7.5056 13z" class="NormalStroke Red" />
                    <path d="m71.906 185.32v3.5h15l-18-18-18 18h15v-3.5h-6.5l9.5-9.5 9.5 9.5z" class="NormalStroke Red" />
                    <path d="m60.824 13.823h2.8868l5.1962 9 5.1962-9h2.8868l-8.0829 14z" class="NormalStroke Red" />
                    <path d="m61.401-13.177h-4.0414l11.547 20 11.547-20h-4.0414l-7.5056 13z" class="NormalStroke Red" />
                    <path d="m68.906-26.177-9.5-9.5h6.5v-3.5h-15l18 18 18-18h-15v3.5h6.5z" class="NormalStroke Red" />
    
                  {/*   <TailstrikeIndicator /> */}
    
                    <path d="m23.906 80.823h90h0" class="NormalOutline" />
                    <path d="m23.906 80.823h90h0" class="NormalStroke White" />
    
                    <g class="FontSmall White Fill EndAlign">
                        <text x="55.729935" y="64.812828">10</text>
                        <text x="88.618317" y="64.812714">10</text>
                        <text x="54.710766" y="46.931034">20</text>
                        <text x="89.564583" y="46.930969">20</text>
                        <text x="50.867237" y="32.910896">30</text>
                        <text x="93.408119" y="32.910839">30</text>
                        <text x="48.308414" y="12.690886">50</text>
                        <text x="96.054962" y="12.690853">50</text>
                        <text x="43.050652" y="-17.138285">80</text>
                        <text x="101.48304" y="-17.138248">80</text>
                        <text x="55.781109" y="99.81395">10</text>
                        <text x="88.669487" y="99.813919">10</text>
                        <text x="54.645519" y="110.8641">20</text>
                        <text x="89.892426" y="110.86408">20</text>
                        <text x="51.001217" y="120.96314">30</text>
                        <text x="93.280037" y="120.96311">30</text>
                        <text x="48.220913" y="140.69778">50</text>
                        <text x="96.090324" y="140.69786">50</text>
                        <text x="43.125065" y="170.80962">80</text>
                        <text x="101.38947" y="170.80959">80</text>
                    </g>
                </g>
                <path d="m40.952 49.249v-20.562h55.908v20.562z" class="NormalOutline SkyFill" />
                <path d="m40.952 49.249v-20.562h55.908v20.562z" class="NormalStroke White" />
                <SideslipIndicator bus={this.props.bus} instrument={this.props.instrument} />
                <RisingGround bus={this.props.bus} /> 
             {/*    {this.props.heading.isNormalOperation()
                && (
                    <HorizontalTape
                        //graduationElementFunction={TickFunction}
                        bugs={bugs}
                        yOffset={yOffset}
                        displayRange={DisplayRange}
                        distanceSpacing={DistanceSpacing}
                        valueSpacing={ValueSpacing}
                        heading={this.props.heading}
                    />
                )} */}
{/*                 {!this.props.isAttExcessive&&  */}
                 <RadioAltAndDH bus={this.props.bus} />
 {/*                <FlightPathVector />
                {!this.props.isAttExcessive
                && <FlightPathDirector FDActive={this.props.FDActive} />} */}
            </g>
        );
    }


  
}
/* 
const FlightPathVector = () => {
    if (!getSimVar('L:A32NX_TRK_FPA_MODE_ACTIVE', 'bool')) {
        return null;
    }

    const roll = getSimVar('PLANE BANK DEGREES', 'degrees');
    const pitch = -getSimVar('PLANE PITCH DEGREES', 'degrees');
    const AOA = getSimVar('INCIDENCE ALPHA', 'degrees');
    const FPA = pitch - (Math.cos(roll * Math.PI / 180) * AOA);
    const DA = getSmallestAngle(getSimVar('GPS GROUND TRUE TRACK', 'degrees'), getSimVar('GPS GROUND TRUE HEADING', 'degrees'));

    const xOffset = Math.max(Math.min(DA, 21), -21) * DistanceSpacing / ValueSpacing;
    const yOffset = calculateHorizonOffsetFromPitch(pitch) - calculateHorizonOffsetFromPitch(FPA);

    return (
        <g transform={`translate(${xOffset} ${yOffset})`}>
            <svg x="53.4" y="65.3" width="31px" height="31px" version="1.1" viewBox="0 0 31 31" xmlns="http://www.w3.org/2000/svg">
                <g transform={`rotate(${-roll} 15.5 15.5)`}>
                    <path
                        className="NormalOutline"
                        // eslint-disable-next-line max-len
                        d="m17.766 15.501c8.59e-4 -1.2531-1.0142-2.2694-2.2665-2.2694-1.2524 0-2.2674 1.0163-2.2665 2.2694-8.57e-4 1.2531 1.0142 2.2694 2.2665 2.2694 1.2524 0 2.2674-1.0163 2.2665-2.2694z"
                    />
                    <path className="ThickOutline" d="m17.766 15.501h5.0367m-9.5698 0h-5.0367m7.3033-2.2678v-2.5199" />
                    <path
                        className="NormalStroke Green"
                        // eslint-disable-next-line max-len
                        d="m17.766 15.501c8.59e-4 -1.2531-1.0142-2.2694-2.2665-2.2694-1.2524 0-2.2674 1.0163-2.2665 2.2694-8.57e-4 1.2531 1.0142 2.2694 2.2665 2.2694 1.2524 0 2.2674-1.0163 2.2665-2.2694z"
                    />
                    <path className="ThickStroke Green" d="m17.766 15.501h5.0367m-9.5698 0h-5.0367m7.3033-2.2678v-2.5199" />
                </g>
            </svg>
        </g>
    );
};

const FlightPathDirector = ({ FDActive }) => {
    if (!FDActive || !getSimVar('L:A32NX_TRK_FPA_MODE_ACTIVE', 'bool')) {
        return null;
    }

    const lateralAPMode = getSimVar('L:A32NX_FMA_LATERAL_MODE', 'number');
    const verticalAPMode = getSimVar('L:A32NX_FMA_VERTICAL_MODE', 'enum');
    const showLateralFD = lateralAPMode !== 0 && lateralAPMode !== 34 && lateralAPMode !== 40;
    const showVerticalFD = verticalAPMode !== 0 && verticalAPMode !== 34;

    if (!showVerticalFD && !showLateralFD) {
        return null;
    }

    const FDRollOrder = getSimVar('L:A32NX_FLIGHT_DIRECTOR_BANK', 'number');
    const currentRoll = getSimVar('PLANE BANK DEGREES', 'degrees');
    const FDRollOffset = (FDRollOrder - currentRoll) * 0.77;

    const DA = getSmallestAngle(getSimVar('GPS GROUND TRUE TRACK', 'degrees'), getSimVar('GPS GROUND TRUE HEADING', 'degrees'));

    const xOffset = Math.max(Math.min(DA, 21), -21) * DistanceSpacing / ValueSpacing;

    const FDPitchOrder = getSimVar('L:A32NX_FLIGHT_DIRECTOR_PITCH', 'number');
    const currentPitch = -getSimVar('PLANE PITCH DEGREES', 'degrees');
    const AOA = getSimVar('INCIDENCE ALPHA', 'degrees');
    const FPA = currentPitch - (Math.cos(currentRoll * Math.PI / 180) * AOA);

    const yOffset = calculateHorizonOffsetFromPitch(currentPitch) - calculateHorizonOffsetFromPitch(FPA) + (FDPitchOrder) * 0.44;

    return (
        <g transform={`translate(${xOffset} ${yOffset})`}>
            <svg x="53.4" y="65.3" width="31px" height="31px" version="1.1" viewBox="0 0 31 31" xmlns="http://www.w3.org/2000/svg">
                <g transform={`rotate(${FDRollOffset} 15.5 15.5)`} className="CornerRound">
                    <path
                        className="NormalOutline"
                        // eslint-disable-next-line max-len
                        d="m16.507 15.501a1.0074 1.008 0 1 0-2.0147 0 1.0074 1.008 0 1 0 2.0147 0zm7.5551 0 6.5478-1.5119v3.0238l-6.5478-1.5119m-17.125 0-6.5478-1.5119v3.0238l6.5478-1.5119h17.125"
                    />
                    <path
                        className="NormalStroke Green"
                        // eslint-disable-next-line max-len
                        d="m16.507 15.501a1.0074 1.008 0 1 0-2.0147 0 1.0074 1.008 0 1 0 2.0147 0zm7.5551 0 6.5478-1.5119v3.0238l-6.5478-1.5119m-17.125 0-6.5478-1.5119v3.0238l6.5478-1.5119h17.125"
                    />
                </g>
            </svg>
        </g>
    );
};

const TailstrikeIndicator = () => {
    // should also not be displayed when thrust levers are at or above FLX/MCT, but I don't know if there is a simvar
    // for that
    if (getSimVar('PLANE ALT ABOVE GROUND MINUS CG', 'feet') > 400
        || getSimVar('AIRSPEED INDICATED', 'knots') < 50
        || getSimVar('L:A32NX_AUTOTHRUST_TLA:1', 'number') >= 35
        || getSimVar('L:A32NX_AUTOTHRUST_TLA:2', 'number') >= 35) {
        return null;
    }

    return (
        <path id="TailstrikeWarning" d="m72.682 50.223h2.9368l-6.7128 8-6.7128-8h2.9368l3.7759 4.5z" className="NormalStroke Amber" />
    );
};
*/
interface RadioAltAndDHProps {
    radioAlt: number;
    decisionHeight: number;
    roll: Arinc429Word;
}

class RadioAltAndDH extends DisplayComponent<{ bus: EventBus }> {

    private visibilitySub = Subject.create('visible');
    private offsetSub = Subject.create('');
    private radioAltClassSub  = Subject.create('');
    private dhClassSub  = Subject.create('');
    private dhVisibilitySub = Subject.create('hidden');

    private textSub = Subject.create('');

    private roll = new Arinc429Word(0);
    private dh = 0;


    onAfterRender(node: VNode): void {
        super.onAfterRender(node);

        const sub = this.props.bus.getSubscriber<PFDSimvars>();

        sub.on('roll').handle(r => {
            const roll = new Arinc429Word(r);
            this.roll = roll;
        }) 

        
        sub.on('dh').handle(dh => {
            this.dh = dh;
        }) 



        sub.on('radio_alt').handle(ra => {

            if(ra > 2500){
                this.visibilitySub.set('hidden');
            } else {
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
                } else if (ra <= 50) {
                    text = (Math.round(ra / 5) * 5).toString();
                } else if (ra > 50 || (ra > this.dh + 100 && DHValid)) {
                    text = (Math.round(ra / 10) * 10).toString();
                }
                this.textSub.set(text);

                if(ra <= this.dh) {
                    this.dhClassSub.set('FontLargest Amber EndAlign Blink9Seconds');
                    this.dhVisibilitySub.set('visible');
                } else {
                    this.dhClassSub.set('FontLargest Amber EndAlign');
                    this.dhVisibilitySub.set('hidden');
                }
            }

        })
    }

    render(): VNode  {
       
        
    
            return (
                <g visibility={this.visibilitySub} id="DHAndRAGroup" transform={this.offsetSub}>
                    <text id="AttDHText" x="73.511879" y="113.19068" visibility={this.dhVisibilitySub} class={this.dhClassSub}>DH</text>
                    <text id="RadioAlt" x="68.803764" y="119.88165" class={this.radioAltClassSub}>{this.textSub}</text>
                </g>
            );
        
    }
   
};


interface SideslipIndicatorProps {
    bus: EventBus;
    instrument: BaseInstrument;
}

class SideslipIndicator extends DisplayComponent<SideslipIndicatorProps>  {

    private sideslipIndicatorFilter = new LagFilter(0.8);

    private classNameSub = Subject.create('Yellow');

    private rollTriangleSub = Subject.create('');
    private slideSlipSub = Subject.create('');


    onAfterRender(node: VNode): void {
        super.onAfterRender(node);

        const sub = this.props.bus.getSubscriber<PFDSimvars>();

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
            } else {
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
    render(): VNode {


        return (
            <g id="RollTriangleGroup" transform={this.rollTriangleSub} class="NormalStroke Yellow CornerRound">
                <path d="m66.074 43.983 2.8604-4.2333 2.8604 4.2333z" />
                <path
                    id="SideSlipIndicator"
                    transform={this.slideSlipSub}
                    d="m73.974 47.208-1.4983-2.2175h-7.0828l-1.4983 2.2175z"
                />
            </g>
        );
    }

 
};



class RisingGround extends DisplayComponent<{ bus: EventBus }> {

    private lastRadioAlt = 0;
    private lastPitch = new Arinc429Word(0);

    private transformStringSub = Subject.create('');

    onAfterRender(node: VNode): void {
        super.onAfterRender(node);

        const sub = this.props.bus.getSubscriber<PFDSimvars>();

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

    render(): VNode {

      
    
        return (
            <g id="HorizonGroundRectangle" transform={this.transformStringSub}>
                <path d="m113.95 157.74h-90.08v-45.357h90.08z" class="NormalOutline EarthFill" />
                <path d="m113.95 157.74h-90.08v-45.357h90.08z" class="NormalStroke White" />
            </g>
        );
    }
  
}; 

