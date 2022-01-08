import { DisplayComponent, EventBus, FSComponent, HEvent, Subject, VNode } from 'msfssdk';
import { PFDSimvars } from '../shared/PFDSimvarPublisher';
import { LagFilter } from './PFDUtils';

export class LandingSystem extends DisplayComponent<{ bus: EventBus, instrument: BaseInstrument }> {

    private lsButtonPressedVisibilitySub = Subject.create(false);

    private lsGroupRef =  FSComponent.createRef<SVGGElement>();

    private getDisplayIndex = () => {
        const url = document.getElementsByTagName('a32nx-pfd')[0].getAttribute('url');
        return url ? parseInt(url.substring(url.length - 1), 10) : 0;
    }

    onAfterRender(node: VNode): void {
        super.onAfterRender(node);

        const hSub = this.props.bus.getSubscriber<HEvent>();

        hSub.on('hEvent').handle(eventName => {
          if(eventName === `A320_Neo_PFD_BTN_LS_${this.getDisplayIndex()}`)  {
              this.lsButtonPressedVisibilitySub.set(!this.lsButtonPressedVisibilitySub.get());
              SimVar.SetSimVarValue(`L:BTN_LS_${this.getDisplayIndex()}_FILTER_ACTIVE`, this.lsButtonPressedVisibilitySub.get() ? '1': '0' , 'Bool');
          }
        })


    }

    render(): VNode  {
        let showVDev = false;

      /*   if (!LSButtonPressed) {
            showVDev = !!Simplane.getAutoPilotApproachLoaded() && Simplane.getAutoPilotApproachType() === 10;
        } */
    
    
        return (
            <g id="LSAndDeviationGroup">
                <LandingSystemInfo bus={this.props.bus}/>
                
                   {/*  <g id="LSGroup" ref={this.lsGroupRef}>
                        <LocalizerIndicator />
                        <GlideslopeIndicator />
                        <MarkerBeaconIndicator />
                    </g> */}
            
               {/*  {showVDev && (
                    <g id="DeviationGroup">
                        <VDevIndicator />
                        <LDevIndicator />
                    </g>
                )} */}
            </g>
        );
    }
   
}

class LandingSystemInfo extends DisplayComponent<{ bus: EventBus }> {

    private hasLoc = false;
    private hasDme = false;


    private identText = Subject.create('');

    private freqTextLeading = Subject.create('');
    private freqTextTrailing = Subject.create('');

    private navFreq = 0;

    private dme = 0;
    private dmeVisibilitySub = Subject.create('');
    private distLeading = Subject.create('');

    private distTrailing = Subject.create('');


    onAfterRender(node: VNode): void {
        super.onAfterRender(node);

        const sub = this.props.bus.getSubscriber<PFDSimvars>();

        sub.on('hasLoc').whenChanged().handle(hasLoc => {
            this.hasLoc = hasLoc;
            this.updateContents();

        });

        sub.on('hasDme').whenChanged().handle(hasDme => {
            this.hasDme = hasDme;
            this.updateContents();

        });

        sub.on('navIdent').whenChanged().handle(navIdent => {
            this.identText.set(navIdent);
            this.updateContents();

        });

        
        sub.on('navFreq').whenChanged().handle(navFreq => {
            this.navFreq = navFreq;
            this.updateContents();

        });

        sub.on('dme').whenChanged().handle(dme => {
            this.dme = dme;
            this.updateContents();
        });
    }

    private updateContents() {
        const freqTextSplit = (Math.round(this.navFreq * 1000) / 1000).toString().split('.');
        this.freqTextLeading.set(freqTextSplit[0]);
        this.freqTextTrailing.set(`.${freqTextSplit[1].padEnd(2, '0')}`);
    
        const hasDME = this.hasDme;

        this.distLeading.set('');
        this.distTrailing.set('');
        if (hasDME) {
            this.dmeVisibilitySub.set('visible');
            const dist = Math.round(this.dme * 10) / 10;
    
            if (dist < 20) {
                const distSplit = dist.toString().split('.');
    
                this.distLeading.set(distSplit[0]);
                this.distTrailing.set(`.${distSplit.length > 1 ? distSplit[1] : '0'}`);
            } else {
                this.distLeading.set(Math.round(dist).toString());
                this.distTrailing.set('');
            }
        } else {
            this.dmeVisibilitySub.set('hidden');
        }
    
    }

    render(): VNode {

/*         if (!displayed || !getSimVar('NAV HAS LOCALIZER:3', 'Bool')) {
            return null;
        } */
    
        // normally the ident and freq should be always displayed when an ILS freq is set, but currently it only show when we have a signal
    

        return (
            <g id="LSInfoGroup">
                <text id="ILSIdent" class="Magenta FontLarge AlignLeft" x="1.5204413" y="145.11539">{this.identText}</text>
                <text id="ILSFreqLeading" class="Magenta FontLarge AlignLeft" x="1.0791086" y="151.14395">{this.freqTextLeading}</text>
                <text id="ILSFreqTrailing" class="Magenta FontSmallest AlignLeft" x="14.297637" y="151.26903">{this.freqTextTrailing}</text>
           
                    <g id="ILSDistGroup" visibiltiy={this.dmeVisibilitySub}>
                        <text class="Magenta AlignLeft" x="0.69199055" y="157.26602">
                            <tspan id="ILSDistLeading" class="FontLarge">{this.distLeading}</tspan>
                            <tspan id="ILSDistTrailing" class="FontSmallest">{this.distTrailing}</tspan>
                        </text>
                        <text class="Cyan FontSmallest AlignLeft" x="17.303238" y="157.2491">NM</text>
                    </g>
             
            </g>
        );
    }
   
}

const LocalizerIndicator = () => {
    const [hasLoc] = useSimVar('NAV HAS LOCALIZER:3', 'Bool', 250);
    const [radialError] = useSimVar('NAV RADIAL ERROR:3', 'degrees', 250);
    const [filterLocalizerIndicator] = useState(() => new LagFilter(1.5));
    const [diamond, setDiamond] = useState<JSX.Element | null>(null);

    useUpdate((deltaTime) => {
        if (hasLoc) {
            const deviation = filterLocalizerIndicator.step(radialError, deltaTime / 1000);
            const dots = deviation / 0.8;

            if (dots > 2) {
                setDiamond(<path id="LocDiamondRight" className="NormalStroke Magenta" d="m99.127 133.03 3.7776-2.5198-3.7776-2.5198" />);
            } else if (dots < -2) {
                setDiamond(<path id="LocDiamondLeft" className="NormalStroke Magenta" d="m38.686 133.03-3.7776-2.5198 3.7776-2.5198" />);
            } else {
                setDiamond(<path
                    id="LocDiamond"
                    className="NormalStroke Magenta"
                    transform={`translate(${dots * 30.221 / 2} 0)`}
                    d="m65.129 130.51 3.7776 2.5198 3.7776-2.5198-3.7776-2.5198z"
                />);
            }
        } else {
            setDiamond(null);
            filterLocalizerIndicator.reset();
        }
    });

    return (
        <g id="LocalizerSymbolsGroup">
            <path className="NormalStroke White" d="m54.804 130.51a1.0073 1.0079 0 1 0-2.0147 0 1.0073 1.0079 0 1 0 2.0147 0z" />
            <path className="NormalStroke White" d="m39.693 130.51a1.0074 1.0079 0 1 0-2.0147 0 1.0074 1.0079 0 1 0 2.0147 0z" />
            <path className="NormalStroke White" d="m85.024 130.51a1.0073 1.0079 0 1 0-2.0147 0 1.0073 1.0079 0 1 0 2.0147 0z" />
            <path className="NormalStroke White" d="m100.13 130.51a1.0074 1.0079 0 1 0-2.0147 0 1.0074 1.0079 0 1 0 2.0147 0z" />
            {diamond}
            <path id="LocalizerNeutralLine" className="Yellow Fill" d="m68.098 134.5v-8.0635h1.5119v8.0635z" />
        </g>
    );
};

const GlideslopeIndicator = () => {
    const [hasGlideslope] = useSimVar('NAV HAS GLIDE SLOPE:3', 'Bool', 250);
    const [glideSlopeError] = useSimVar('NAV GLIDE SLOPE ERROR:3', 'degrees', 250);
    const [filterGlideslopeIndicator] = useState(() => new LagFilter(1.5));
    const [diamond, setDiamond] = useState<JSX.Element | null>(null);

    useUpdate((deltaTime) => {
        if (hasGlideslope) {
            const deviation = filterGlideslopeIndicator.step(glideSlopeError, deltaTime / 1000);
            const dots = deviation / 0.4;

            if (dots > 2) {
                setDiamond(<path id="GlideSlopeDiamondLower" className="NormalStroke Magenta" d="m107.19 111.06 2.5184 3.7798 2.5184-3.7798" />);
            } else if (dots < -2) {
                setDiamond(<path id="GlideSlopeDiamondUpper" className="NormalStroke Magenta" d="m107.19 50.585 2.5184-3.7798 2.5184 3.7798" />);
            } else {
                setDiamond(<path
                    id="GlideSlopeDiamond"
                    className="NormalStroke Magenta"
                    transform={`translate(0 ${dots * 30.238 / 2})`}
                    d="m109.7 77.043-2.5184 3.7798 2.5184 3.7798 2.5184-3.7798z"
                />);
            }
        } else {
            setDiamond(null);
            filterGlideslopeIndicator.reset();
        }
    });

    return (
        <g id="GlideslopeSymbolsGroup">
            <path className="NormalStroke White" d="m110.71 50.585a1.0074 1.0079 0 1 0-2.0147 0 1.0074 1.0079 0 1 0 2.0147 0z" />
            <path className="NormalStroke White" d="m110.71 65.704a1.0074 1.0079 0 1 0-2.0147 0 1.0074 1.0079 0 1 0 2.0147 0z" />
            <path className="NormalStroke White" d="m110.71 95.942a1.0074 1.0079 0 1 0-2.0147 0 1.0074 1.0079 0 1 0 2.0147 0z" />
            <path className="NormalStroke White" d="m110.71 111.06a1.0074 1.0079 0 1 0-2.0147 0 1.0074 1.0079 0 1 0 2.0147 0z" />
            {diamond}
        </g>
    );
};

const VDevIndicator = () => {
    const deviation = getSimVar('GPS VERTICAL ERROR', 'feet');
    const dots = deviation / 100;

    let diamond: JSX.Element;

    if (dots > 2) {
        diamond = <path id="VDevSymbolLower" className="NormalStroke Green" d="m107.19 111.06v2.0159h5.0368v-2.0159" />;
    } else if (dots < -2) {
        diamond = <path id="VDevSymbolUpper" className="NormalStroke Green" d="m107.19 50.585v-2.0159h5.0368v2.0159" />;
    } else {
        diamond = <path id="VDevSymbol" className="NormalStroke Green" transform={`translate(0 ${dots * 30.238 / 2})`} d="m112.22 78.807h-5.0368v4.0318h5.0368v-2.0159z" />;
    }

    return (
        <g id="VertDevSymbolsGroup">
            <text className="FontSmall AlignRight Green" x="95.022" y="43.126">V/DEV</text>
            <path className="NormalStroke White" d="m108.7 65.704h2.0147" />
            <path className="NormalStroke White" d="m108.7 50.585h2.0147" />
            <path className="NormalStroke White" d="m108.7 111.06h2.0147" />
            <path className="NormalStroke White" d="m108.7 95.942h2.0147" />
            {diamond}
        </g>
    );
};

// Not implemented on the FMS side I think, so this is just static and hidden for now
const LDevIndicator = () => (
    <g id="LatDeviationSymbolsGroup" style={{ display: 'none' }}>
        <text className="FontSmall AlignRight Green" x="30.888" y="122.639">L/DEV</text>
        <path className="NormalStroke White" d="m38.686 129.51v2.0158" />
        <path className="NormalStroke White" d="m53.796 129.51v2.0158" />
        <path className="NormalStroke White" d="m84.017 129.51v2.0158" />
        <path className="NormalStroke White" d="m99.127 129.51v2.0158" />
        <path id="LDevSymbolLeft" className="NormalStroke Green" d="m38.686 127.99h-2.0147v5.0397h2.0147" />
        <path id="LDevSymbolRight" className="NormalStroke Green" d="m99.127 127.99h2.0147v5.0397h-2.0147" />
        <path id="LDevSymbol" className="NormalStroke Green" d="m66.892 127.99v5.0397h4.0294v-5.0397h-2.0147z" />
    </g>
);

const MarkerBeaconIndicator = () => {
    const markerState = getSimVar('MARKER BEACON STATE', 'Enum');

    let classNames = '';
    let markerText = '';

    if (markerState === 0) {
        return null;
    } if (markerState === 1) {
        classNames = 'Cyan OuterMarkerBlink';
        markerText = 'OM';
    } else if (markerState === 2) {
        classNames = 'Amber MiddleMarkerBlink';
        markerText = 'MM';
    } else {
        classNames = 'White InnerMarkerBlink';
        markerText = 'IM';
    }

    return (
        <text id="ILSMarkerText" className={`FontLarge StartAlign ${classNames}`} x="98.339211" y="125.12898">{markerText}</text>
    );
};