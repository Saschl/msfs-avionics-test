import { Arinc429Word } from '../shared/arinc429';
import { getSmallestAngle } from '../shared/utils';
import { DisplayComponent, EventBus, FSComponent, NodeReference, Subject, Subscribable, VNode } from 'msfssdk';
import { HeadingBug } from './horizon';
import { PFDSimvars } from '../shared/PFDSimvarPublisher';

export const calculateHorizonOffsetFromPitch = (pitch: number) => {
    if (pitch > -5 && pitch <= 20) {
        return pitch * 1.8;
    } if (pitch > 20 && pitch <= 30) {
        return -0.04 * pitch ** 2 + 3.4 * pitch - 16;
    } if (pitch > 30) {
        return 20 + pitch;
    } if (pitch < -5 && pitch >= -15) {
        return 0.04 * pitch ** 2 + 2.2 * pitch + 1;
    }
    return pitch - 8;
};

export const calculateVerticalOffsetFromRoll = (roll: number) => {
    let offset = 0;

    if (Math.abs(roll) > 60) {
        offset = Math.max(0, 41 - 35.87 / Math.sin(Math.abs(roll) / 180 * Math.PI));
    }
    return offset;
};

interface HorizontalTapeProps {
    displayRange: number;
    valueSpacing: number;
    distanceSpacing: number;
    //graduationElementFunction: (elementHeading: number, offset: number) => JSX.Element;
    bugs: [number][];
    yOffset?: number;
    bus: EventBus;
}

export class HorizontalTape extends DisplayComponent<HorizontalTapeProps> {

    private refElement = FSComponent.createRef<SVGGElement>();

    private refElement2 = FSComponent.createRef<SVGGElement>();



    private currentHeading: number = 0;

  
    private buildGraduationElements(): SVGGElement[] {
        const headingTicks: SVGGElement[] = [];
      

        const numTicks = 72;//Math.round(this.props.displayRange * 100 / this.props.valueSpacing);

      /*   let leftmostHeading = Math.round((this.currentHeading - this.props.displayRange) / this.props.valueSpacing) * this.props.valueSpacing;
        if (leftmostHeading < this.currentHeading - this.props.displayRange) {
            leftmostHeading += this.props.valueSpacing;
        } */

        // FIXME
        let leftmostHeading = 0;
    
    
        for (let i = 0; i < numTicks; i++) {

            let text = '';
            let classText = '';
            let tickLength = 3.8302;
            let textYPos: number | undefined;

            const elementHeading = leftmostHeading + i * this.props.valueSpacing;
            const offset = elementHeading * this.props.distanceSpacing / this.props.valueSpacing;

            
        const roundedHeading = Math.round(elementHeading);
        //console.log(roundedHeading);
        if (roundedHeading % 10 === 0) {
            if (roundedHeading % 30 === 0) {
                classText = 'FontMedium';
                textYPos = 154.64206;
            } else {
                classText = 'FontSmallest';
                textYPos = 154.27985;
            }
            let textVal = Math.round(elementHeading / 10) % 36;
            if (textVal < 0) {
                textVal += 36;
            }
            text = textVal.toString();
        } else {
            tickLength *= 0.42;
        }

        const tickRef = FSComponent.createRef<SVGGElement>();
            headingTicks.push(<g id="HeadingTick" ref={tickRef} transform={`translate(${offset} 0)`}>
                <path class="NormalStroke White" d={`m68.913 145.34v${tickLength}`} />
                <text id="HeadingLabel" class={`White MiddleAlign ${classText}`} x="68.879425" y={textYPos}>{text}</text>
           
             </g>)
        }

        return headingTicks;
    }

    onAfterRender(node: VNode): void {
        super.onAfterRender(node);

        const pf = this.props.bus.getSubscriber<PFDSimvars>();

        pf.on('heading').whenChanged().handle(h => {
            const newVal = new Arinc429Word(h);
           // this.currentHeading = newVal.value;
           //console.log(newVal.value);
           const offset = -newVal.value * this.props.distanceSpacing / this.props.valueSpacing;


           let offset2 = -newVal.value * this.props.distanceSpacing / this.props.valueSpacing;
           //calced from 40 degrees (~ the range of the tape)
           if(Math.abs(offset) <= 60.44) {
               //calced from 360 degrees
               offset2 = -543.6 + offset;
           } else {
               offset2 += 543.6;
           }
            this.refElement.instance.setAttribute('transform',`translate(${offset} 0)`)
            this.refElement2.instance.setAttribute('transform',`translate(${offset2} 0)`)

        })

    }

    render(): VNode {


    const numTicks = Math.round(this.props.displayRange * 2 / this.props.valueSpacing);

/*     let leftmostHeading = Math.round((this.props.heading.value - this.props.displayRange) / this.props.valueSpacing) * this.props.valueSpacing;
    if (leftmostHeading < this.props.heading.value - this.props.displayRange) {
        leftmostHeading += this.props.valueSpacing;
    } */

    //const graduationElements: JSX.Element[] = [];
    const bugElements: number[] = [];

/*     for (let i = 0; i < numTicks; i++) {
        const elementHeading = leftmostHeading + i * this.props.valueSpacing;
        const offset = elementHeading * this.props.distanceSpacing / this.props.valueSpacing;
        //graduationElements.push(graduationElementFunction(elementHeading, offset));
    }
 */
/*     this.props.bugs.forEach((currentElement) => {
        const angleToZero = getSmallestAngle(this.props.heading.value, 0);
        const smallestAngle = getSmallestAngle(currentElement[0], 0);
        let offset = currentElement[0];
        if (Math.abs(angleToZero) < 90 && Math.abs(smallestAngle) < 90) {
            if (angleToZero > 0 && smallestAngle < 0) {
                offset = currentElement[0] - 360;
            } else if (angleToZero < 0 && smallestAngle > 0) {
                offset = currentElement[0] + 360;
            }
        }

        offset *= this.props.distanceSpacing / this.props.valueSpacing;
        bugElements.push(offset);
    }); */

        return (
            <>
            <g ref={this.refElement}>
                {/* {graduationElements} */}
                {this.buildGraduationElements()}
               
                {bugElements.forEach(offet => {
                    <HeadingBug offset={offet}/>
                })}
            </g>
             <g ref={this.refElement2}>
             {/* {graduationElements} */}
             {this.buildGraduationElements()}
            
             {bugElements.forEach(offet => {
                 <HeadingBug offset={offet}/>
             })}
         </g>
         </>
        );
    }
   
}

interface VerticalTapeProps {
    displayRange: number;
    valueSpacing: number;
    distanceSpacing: number;
    bugs: [(offset: number) => SVGElement, number][];
    tapeValue: Subscribable<number>;
    lowerLimit?: number;
    upperLimit?: number;
    type: 'altitude' | 'speed';
}

export class VerticalTape extends DisplayComponent<VerticalTapeProps> {

    private refElement = FSComponent.createRef<SVGGElement>();

    private buildSpeedGraduationPoints(): NodeReference<SVGGElement>[] {
        const numTicks = Math.round(this.props.displayRange * 100 / this.props.valueSpacing);
           
        let lowestValue = 30;

        if (lowestValue < this.props.tapeValue.get() - this.props.displayRange) {
            lowestValue += this.props.valueSpacing;
        }
    

        const graduationPoints = [];

                for (let i = 0; i < numTicks; i++) {
                    const elementValue = lowestValue + i * this.props.valueSpacing;
                    if (elementValue <= (this.props.upperLimit ??  Infinity)) {
                        const offset = -elementValue * this.props.distanceSpacing / this.props.valueSpacing;
                        const element = {elementValue, offset};
                        if (element) {
                            //console.log("ADDING", elementValue);
                            //this.refElement.instance.append(<this.props.graduationElementFunction offset={offset} alt={elementValue} />);
    
                            if (elementValue < 30) {
                                return <></>;
                            }
                        
                            let text = '';
                            if (elementValue % 20 === 0) {
                                text = Math.abs(elementValue).toString().padStart(3, '0');
                            }
                        
                            
                            graduationPoints.push( <g transform={`translate(0 ${offset})`}>
                            <path class="NormalStroke White" d="m19.031 80.818h-2.8206" />
                            <text class="FontMedium MiddleAlign White" x="7.7348943" y="82.936722">{text}</text>
                        </g>);
                    }
                }
            }   
            return graduationPoints;
    }

    private buildAltitudeGraduationPoints(): NodeReference<SVGGElement>[] {
        const numTicks = Math.round(this.props.displayRange * 100 / this.props.valueSpacing);


           
        const lowestValue = 0;
        const graduationPoints = [];

                for (let i = 0; i < numTicks; i++) {
                    const elementValue = lowestValue + i * this.props.valueSpacing;
                    if (elementValue <= (this.props.upperLimit ??  Infinity)) {
                        const offset = -elementValue * this.props.distanceSpacing / this.props.valueSpacing;
                        const element = {elementValue, offset};
                        if (element) {
                            //console.log("ADDING", newValue.value);
                            //this.refElement.instance.append(<this.props.graduationElementFunction offset={offset} alt={elementValue} />);
    
                            let text = '';
                            let isText = false;
                            if (elementValue % 500 === 0) {
                                isText = true;
                                text = (Math.abs(elementValue) / 100).toString().padStart(3, '0');
                            }
                        
       
                            
                            graduationPoints.push(<g transform={`translate(0 ${offset})`}>
                                {text &&
                                     <path class="NormalStroke White" d="m115.79 81.889 1.3316-1.0783-1.3316-1.0783" />}          
                            <path class="NormalStroke White" d="m130.85 80.819h-2.0147" />
                            <text class="FontMedium MiddleAlign White" x="122.98842" y="82.939713">{text}</text>
                        </g>);
                    }
                }
            }   
            return graduationPoints;
    }


    onAfterRender(node: VNode): void {
        super.onAfterRender(node);
        this.props.tapeValue.sub(a => {



            const newValue = new Arinc429Word(a);

            const clampedValue = Math.max(Math.min(newValue.value, this.props.upperLimit ?? Infinity), this.props.lowerLimit ?? -Infinity);
    
            let lowestValue = 30;//Math.max(Math.round((clampedValue - this.props.displayRange) / this.props.valueSpacing) *this.props. valueSpacing, this.props.lowerLimit??-Infinity);
            if (lowestValue < newValue.value - this.props.displayRange) {
                lowestValue += this.props.valueSpacing;
            }

            this.refElement.instance.setAttribute('transform', `translate(0 ${clampedValue * this.props.distanceSpacing / this.props.valueSpacing})`);

           
        });
    }
   

    render(): VNode {
        

        const bugElements: number[] = [];
    
     
    
     /*    this.props.bugs.forEach((currentElement) => {
            const value = currentElement[0];
            const offset = -value * this.props.distanceSpacing / this.props.valueSpacing;
            bugElements.push(offset);
        }); */
        return (
            <g ref={this.refElement}>
                {this.props.type === 'altitude' && this.buildAltitudeGraduationPoints()}
                {this.props.type === 'speed' && this.buildSpeedGraduationPoints()}
                {this.props.children}
             {/*   {this.graduationElements.sub(leThing => {
                   leThing.forEach(v => {
                    <graduationElementFunction offset={v.offset} alt={v.elementValue} />
                   })
               })}  */}
              {/*  {bugElements.forEach(offet => {
                    <HeadingBug offset={offet}/>
                })} */}
            </g>
        );
    }
   
};

/* export const BarberpoleIndicator = (
    tapeValue: number, border: number, isLowerBorder: boolean, displayRange: number,
    element: (offset: number) => JSX.Element, elementSize: number,
) => {
    const Elements: [(offset: number) => JSX.Element, number][] = [];

    const sign = isLowerBorder ? 1 : -1;
    const isInRange = isLowerBorder ? border <= tapeValue + displayRange : border >= tapeValue - displayRange;
    if (!isInRange) {
        return Elements;
    }
    const numElements = Math.ceil((border + sign * tapeValue - sign * (displayRange + 2)) / elementSize);
    for (let i = 0; i < numElements; i++) {
        const elementValue = border + sign * elementSize * i;
        Elements.push([element, elementValue]);
    }

    return Elements;
}; */

export const SmoothSin = (origin: number, destination: number, smoothFactor: number, dTime: number) => {
    if (origin === undefined) {
        return destination;
    }
    if (Math.abs(destination - origin) < Number.EPSILON) {
        return destination;
    }
    const delta = destination - origin;
    let result = origin + delta * Math.sin(Math.min(smoothFactor * dTime, 1.0) * Math.PI / 2.0);
    if ((origin < destination && result > destination) || (origin > destination && result < destination)) {
        result = destination;
    }
    return result;
};

export class LagFilter {
    private PreviousInput: number;

    private PreviousOutput: number;

    private TimeConstant: number;

    constructor(timeConstant: number) {
        this.PreviousInput = 0;
        this.PreviousOutput = 0;

        this.TimeConstant = timeConstant;
    }

    reset() {
        this.PreviousInput = 0;
        this.PreviousOutput = 0;
    }

    /**
     *
     * @param input Input to filter
     * @param deltaTime in seconds
     * @returns {number} Filtered output
     */
    step(input: number, deltaTime: number): number {

     

        const filteredInput = !Number.isNaN(input) ? input : 0;

        const scaledDeltaTime = deltaTime * this.TimeConstant;
        const sum0 = scaledDeltaTime + 2;

        const output = (filteredInput + this.PreviousInput) * scaledDeltaTime / sum0
            + (2 - scaledDeltaTime) / sum0 * this.PreviousOutput;

        this.PreviousInput = filteredInput;

        if (Number.isFinite(output)) {
            this.PreviousOutput = output;
            return output;
        }
        return 0;
    }
}

export class RateLimiter {
    private PreviousOutput: number;

    private RisingRate: number;

    private FallingRate: number;

    constructor(risingRate: number, fallingRate: number) {
        this.PreviousOutput = 0;

        this.RisingRate = risingRate;
        this.FallingRate = fallingRate;
    }

    step(input: number, deltaTime: number) {
        const filteredInput = !Number.isNaN(input) ? input : 0;

        const subInput = filteredInput - this.PreviousOutput;

        const scaledUpper = deltaTime * this.RisingRate;
        const scaledLower = deltaTime * this.FallingRate;

        const output = this.PreviousOutput + Math.max(Math.min(scaledUpper, subInput), scaledLower);
        this.PreviousOutput = output;
        return output;
    }
}
