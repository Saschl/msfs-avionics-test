import { FSComponent } from "msfssdk";
import { EventBus, HEventPublisher } from "msfssdk/data";
import { PFDComponent } from "./components";
import { AdirsValueProvider } from "./shared/AdirsValueProvider";
import { PFDSimvarPublisher } from "./shared/PFDSimvarPublisher";

import './style.scss';


class A32NX_PFD extends BaseInstrument {
 
    private bus: EventBus;
    private simVarPublisher: PFDSimvarPublisher;
    private readonly hEventPublisher; 


    constructor() {
        super();
        this.bus = new EventBus();
        this.simVarPublisher = new PFDSimvarPublisher(this.bus);
        this.hEventPublisher = new HEventPublisher(this.bus);
    }

    get templateID(): string {
        return 'A32NX_PFD';
    }

    public getDeltaTime() {
      return this.deltaTime;
    }

    public onInteractionEvent(args: string[]): void {
      this.hEventPublisher.dispatchHEvent(args[0]);
    }

    public connectedCallback(): void {
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
        this.simVarPublisher.subscribe('hasLoc');
        this.simVarPublisher.subscribe('hasDme');
        this.simVarPublisher.subscribe('navIdent');
        this.simVarPublisher.subscribe('navFreq');
        this.simVarPublisher.subscribe('dme');
        this.simVarPublisher.subscribe('navRadialError');
        this.simVarPublisher.subscribe('hasGlideslope');
        this.simVarPublisher.subscribe('glideSlopeError');
        this.simVarPublisher.subscribe('markerBeacon');
        this.simVarPublisher.subscribe('v1');
        this.simVarPublisher.subscribe('flightPhase');
        this.simVarPublisher.subscribe('vr');


        this.simVarPublisher.startPublish();
        this.hEventPublisher.startPublish();

        new AdirsValueProvider(this.bus, this.simVarPublisher);


        FSComponent.render(<PFDComponent bus={this.bus} instrument={this} />, document.getElementById('PFD_CONTENT'));
    }

      /**
   * A callback called when the instrument gets a frame update.
   */
  public Update(): void {
    super.Update();

    this.simVarPublisher.onUpdate();
  }


}

registerInstrument('a32nx-pfd', A32NX_PFD);
