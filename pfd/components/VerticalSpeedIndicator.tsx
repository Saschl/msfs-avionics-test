import { DisplayComponent, EventBus, FSComponent, Subject, Subscribable, VNode } from 'msfssdk';
import { Arinc429Word } from '../shared/arinc429';
import { PFDSimvars } from '../shared/PFDSimvarPublisher';

interface VerticalSpeedIndicatorProps {
    bus: EventBus,
}

export class VerticalSpeedIndicator extends DisplayComponent<VerticalSpeedIndicatorProps>  {


    private verticalSpeedSub = Subject.create(new Arinc429Word(0));

    private yOffsetSub = Subject.create(0);
    private isAmberSub = Subject.create(-1);


    private lastIrVerticalSpeed = new Arinc429Word(0);


    onAfterRender(node: VNode): void {
        super.onAfterRender(node);

        const sub = this.props.bus.getSubscriber<PFDSimvars>();

        sub.on('vs_inert').whenChanged().handle(ivs => {
            const arinc = new Arinc429Word(ivs);

            if(arinc.isNormalOperation()) {
                this.verticalSpeedSub.set(arinc);
            }
            this.lastIrVerticalSpeed = arinc;
        });

        sub.on('vs_baro').whenChanged().handle(ivs => {
            const arinc = new Arinc429Word(ivs);
           // When available, the IR V/S has priority over the ADR barometric V/S.
            if(!this.lastIrVerticalSpeed.isNormalOperation()) {
                this.verticalSpeedSub.set(arinc);
            }
        });

        this.verticalSpeedSub.sub(vs => {
            const absVSpeed = Math.abs(vs.value);

            const radioAlt = SimVar.GetSimVarValue('PLANE ALT ABOVE GROUND MINUS CG', 'feet');

    
            if (absVSpeed > 6000 || (radioAlt < 2500 && radioAlt > 1000 && vs.value < -2000) || (radioAlt < 1000 && vs.value < -1200)) {
                this.isAmberSub.set(1);
            } else {
                this.isAmberSub.set(0);
            }
        
            const sign = Math.sign(vs.value);
        
        
            if (absVSpeed < 1000) {
                this.yOffsetSub.set(vs.value / 1000 * -27.22);
            } else if (absVSpeed < 2000) {
                this.yOffsetSub.set((vs.value - sign * 1000) / 1000 * -10.1 - sign * 27.22);
            } else if (absVSpeed < 6000) {
                this.yOffsetSub.set((vs.value - sign * 2000) / 4000 * -10.1 - sign * 37.32);
            } else {
                this.yOffsetSub.set(sign * -47.37);
            }
        
        })

    }

    render(): VNode {


  
        return (
            <g>
               {/*  hide when normal ops */}
                <g id='vsfailed'>
                    <path class="TapeBackground" d="m151.84 131.72 4.1301-15.623v-70.556l-4.1301-15.623h-5.5404v101.8z" />
                    <g id="VSpeedFailText">
                        <text class="Blink9Seconds FontLargest Red EndAlign" x="153.13206" y="77.501472">V</text>
                        <text class="Blink9Seconds FontLargest Red EndAlign" x="153.13406" y="83.211388">/</text>
                        <text class="Blink9Seconds FontLargest Red EndAlign" x="152.99374" y="88.870819">S</text>
                    </g>
                </g>

                <path class="TapeBackground" d="m151.84 131.72 4.1301-15.623v-70.556l-4.1301-15.623h-5.5404v101.8z" />
                <g id="VerticalSpeedGroup">
                    <g class="Fill White">
                        <path d="m149.92 54.339v-1.4615h1.9151v1.4615z" />
                        <path d="m149.92 44.26v-1.4615h1.9151v1.4615z" />
                        <path d="m149.92 34.054v-1.2095h1.9151v1.2095z" />
                        <path d="m151.84 107.31h-1.9151v1.4615h1.9151z" />
                        <path d="m151.84 117.39h-1.9151v1.4615h1.9151z" />
                        <path d="m151.84 127.59h-1.9151v1.2095h1.9151z" />
                    </g>
                    <g class="NormalStroke White">
                        <path d="m149.92 67.216h1.7135" />
                        <path d="m151.84 48.569h-1.9151" />
                        <path d="m151.84 38.489h-1.9151" />
                        <path d="m149.92 94.43h1.7135" />
                        <path d="m151.84 113.08h-1.9151" />
                        <path d="m151.84 123.16h-1.9151" />
                    </g>
                    <g class="FontSmallest MiddleAlign Fill White">
                        <text x="148.07108" y="109.72845">1</text>
                        <text x="148.14471" y="119.8801">2</text>
                        <text x="148.07108" y="129.90607">6</text>
                        <text x="148.09711" y="55.316456">1</text>
                        <text x="148.06529" y="45.356102">2</text>
                        <text x="148.11371" y="35.195072">6</text>
                    </g>
                    <path class="Fill Yellow" d="m145.79 80.067h6.0476v1.5119h-6.0476z" />
                    <VSpeedNeedle isAmber={this.isAmberSub} yOffset={this.yOffsetSub} />
                    
                    <VSpeedText yOffset={this.yOffsetSub} isAmber={this.isAmberSub} VSpeed={this.verticalSpeedSub} />
                </g>
            </g>
        );
    }
  
}

class VSpeedNeedle extends DisplayComponent<{ yOffset: Subscribable<number>, isAmber: Subscribable<number> }> {

    private outLineRef = FSComponent.createRef<SVGPathElement>();
    private indicatorRef = FSComponent.createRef<SVGPathElement>();

    onAfterRender(node: VNode): void {
        super.onAfterRender(node);

        this.props.yOffset.sub(offset => {
            this.outLineRef.instance.setAttribute('d', `m162.74 80.822 l -12 ${offset}`);
            this.indicatorRef.instance.setAttribute('d', `m162.74 80.822 l -12 ${offset}`);

        })

        this.props.isAmber.sub(isAmberi => {
            const className = `HugeStroke ${isAmberi === 1 ? 'Amber' : 'Green'}`;
            console.log('le classname '+className);
            this.indicatorRef.instance.setAttribute('class', className);

        })
    }




    render(): VNode | null {
        return (
        
            <>
                <path ref={this.outLineRef} class="HugeOutline" />
                <path ref={this.indicatorRef} id="VSpeedIndicator"  />
            </>
        );
    }
      
  
  
}

class VSpeedText extends DisplayComponent<{ VSpeed: Subscribable<Arinc429Word>, yOffset: Subscribable<number>, isAmber: Subscribable<number> }> {

    private vsTextRef = FSComponent.createRef<SVGTextElement>();
    private groupRef = FSComponent.createRef<SVGGElement>();


    onAfterRender(node: VNode): void {
        super.onAfterRender(node);

        this.props.VSpeed.sub(vs => {
            const absVSpeed = Math.abs(vs.value);
        
            if (absVSpeed < 200) {
                this.groupRef.instance.setAttribute('visibility', 'hidden');
                return;
            } else {
                this.groupRef.instance.setAttribute('visibility', 'visible');
            }
            const sign = Math.sign(vs.value);

            const textOffset = this.props.yOffset.get() - sign * 2.4;


            const text = (Math.round(absVSpeed / 100) < 10 ? '0' : '') + Math.round(absVSpeed / 100).toString();
            this.vsTextRef.instance.textContent = text;
            this.groupRef.instance.setAttribute('transform', `translate(0 ${textOffset})`);

        })

      /*   this.props.yOffset.sub(offset => {

        }) */

        this.props.isAmber.sub(isAmber => {
            const className = `FontSmallest MiddleAlign ${isAmber === 1 ? 'Amber' : 'Green'}`;
            this.vsTextRef.instance.setAttribute('class', className);
        })
    }

    render(): VNode  {
        return (
            <g ref={this.groupRef} id="VSpeedTextGroup">
                <path class="BackgroundFill" d="m158.4 83.011h-7.0514v-4.3989h7.0514z" />
                <text ref={this.vsTextRef} id="VSpeedText" x="154.84036" y="82.554581"></text>
            </g>
        );
    }

 



   
};
