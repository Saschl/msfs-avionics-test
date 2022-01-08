import { FSComponent } from "msfssdk";
import { EventBus } from "msfssdk/data";
import { PFDComponent } from "./components";
import { AdirsValueProvider } from "./shared/AdirsValueProvider";
import { PFDSimvarPublisher } from "./shared/PFDSimvarPublisher";
import './style.scss';
class A32NX_PFD extends BaseInstrument {
    constructor() {
        super();
        this.bus = new EventBus();
        this.simVarPublisher = new PFDSimvarPublisher(this.bus);
    }
    get templateID() {
        return 'A32NX_PFD';
    }
    connectedCallback() {
        super.connectedCallback();
        this.simVarPublisher.subscribe('elec');
        this.simVarPublisher.subscribe('coldDark');
        this.simVarPublisher.subscribe('potentiometer_captain');
        this.simVarPublisher.subscribe('pitch');
        this.simVarPublisher.subscribe('roll');
        this.simVarPublisher.subscribe('heading');
        this.simVarPublisher.subscribe('altitude');
        this.simVarPublisher.subscribe('speed');
        this.simVarPublisher.subscribe('alpha_prot');
        this.simVarPublisher.subscribe('onGround');
        this.simVarPublisher.subscribe('activeLateralMode');
        this.simVarPublisher.subscribe('activeVerticalMode');
        this.simVarPublisher.subscribe('fma_mode_reversion');
        this.simVarPublisher.subscribe('fma_speed_protection');
        this.simVarPublisher.subscribe('AThrMode');
        this.simVarPublisher.subscribe('ap_vs_selected');
        this.simVarPublisher.subscribe('radio_alt');
        this.simVarPublisher.subscribe('approachCapability');
        this.simVarPublisher.subscribe('ap1Active');
        this.simVarPublisher.subscribe('ap2Active');
        this.simVarPublisher.subscribe('fmaVerticalArmed');
        this.simVarPublisher.subscribe('fmaLateralArmed');
        this.simVarPublisher.subscribe('fd1Active');
        this.simVarPublisher.subscribe('fd2Active');
        this.simVarPublisher.subscribe('athrStatus');
        this.simVarPublisher.subscribe('athrModeMessage');
        this.simVarPublisher.subscribe('machPreselVal');
        this.simVarPublisher.subscribe('speedPreselVal');
        this.simVarPublisher.subscribe('mda');
        this.simVarPublisher.subscribe('dh');
        this.simVarPublisher.subscribe('attHdgKnob');
        this.simVarPublisher.subscribe('airKnob');
        this.simVarPublisher.subscribe('vs_baro');
        this.simVarPublisher.subscribe('vs_inert');
        this.simVarPublisher.subscribe('sideStickY');
        this.simVarPublisher.subscribe('sideStickX');
        this.simVarPublisher.subscribe('fdYawCommand');
        this.simVarPublisher.subscribe('fdBank');
        this.simVarPublisher.subscribe('fdPitch');
        this.simVarPublisher.startPublish();
        new AdirsValueProvider(this.bus, this.simVarPublisher);
        FSComponent.render(FSComponent.buildComponent(PFDComponent, { bus: this.bus, instrument: this }), document.getElementById('PFD_CONTENT'));
    }
    /**
 * A callback called when the instrument gets a frame update.
 */
    Update() {
        super.Update();
        this.simVarPublisher.onUpdate();
    }
}
registerInstrument('a32nx-pfd', A32NX_PFD);
//# sourceMappingURL=instrument.js.map