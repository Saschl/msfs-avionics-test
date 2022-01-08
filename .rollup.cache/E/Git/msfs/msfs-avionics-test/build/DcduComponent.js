import { FSComponent, DisplayComponent } from 'msfssdk';
import './DcduInstrument.scss';
export class DcduComponent extends DisplayComponent {
    render() {
        return (FSComponent.buildComponent(FSComponent.Fragment, null,
            FSComponent.buildComponent("svg", { class: "dcdu-lines" },
                FSComponent.buildComponent("g", null,
                    FSComponent.buildComponent("path", { d: "m 21 236 h 450" }),
                    FSComponent.buildComponent("path", { d: "m 130 246 v 124" }),
                    FSComponent.buildComponent("path", { d: "m 362 246 v 124" }))),
            FSComponent.buildComponent("svg", { class: "inop-wrapper" },
                FSComponent.buildComponent("text", { x: "246", y: "170" }, "INOP."))));
    }
}
/* function SelfTest() {
    return (
        <svg className="text-wrapper">
            <text x="246" y="170">SELF TEST IN PROGRESS</text>
            <text x="246" y="210">(MAX 10 SECONDS)</text>
        </svg>
    );
}
function powerAvailable() {
    // Each DCDU is powered by a different DC BUS. Sadly the cockpit only contains a single DCDU emissive.
    // Once we have two DCDUs running, the capt. DCDU should be powered by DC 1, and F/O by DC 2.
    return getSimVar('L:A32NX_ELEC_DC_1_BUS_IS_POWERED', 'Bool') || getSimVar('L:A32NX_ELEC_DC_2_BUS_IS_POWERED', 'Bool');
}


function WaitingForData() {
    return (
        <svg className="text-wrapper">
            <text x="246" y="170">WAITING FOR DATA</text>
            <text x="246" y="210">(MAX 30 SECONDS)</text>
        </svg>
    );
}

function Idle() {
    const [inop, setInop] = useState(false);

    useInteractionEvent('A32NX_DCDU_BTN_INOP', () => {
        if (!inop) {
            setInop(true);
            setTimeout(() => {
                setInop(false);
            }, 3000);
        }
    });





}
function DCDU() {
    const [state, setState] = useState('DEFAULT');

    useUpdate((_deltaTime) => {
        if (state === 'OFF') {
            if (powerAvailable()) {
                setState('ON');
            }
        } else if (!powerAvailable()) {
            setState('OFF');
        }
    });

    switch (state) {
    case 'DEFAULT':
        if (getSimVar('L:A32NX_COLD_AND_DARK_SPAWN')) {
            setState('OFF');
        } else {
            setState('IDLE');
        }

        return <></>;
    case 'OFF':
        return <></>;
    case 'ON':
        setTimeout(() => {
            if (powerAvailable()) {
                setState('WAITING');
            }
        }, 8000);
        return (
            <>
                <div className="BacklightBleed" />
                <SelfTest />
            </>
        );

    case 'WAITING':
        setTimeout(() => {
            if (powerAvailable()) {
                setState('IDLE');
            }
        }, 12000);
        return (
            <>
                <div className="BacklightBleed" />
                <WaitingForData />
            </>
        );
    case 'IDLE':
        return (
            <>
                <div className="BacklightBleed" />
                <Idle />
            </>
        );
    default:
        throw new RangeError();
    }
}

ReactDOM.render(<DCDU />, renderTarget);
 */ 
//# sourceMappingURL=DcduComponent.js.map