import { FSComponent } from "msfssdk";
import { DcduComponent } from "./DcduComponent";

class DcduInstrument extends BaseInstrument {
    get templateID(): string {
      return 'dcduinstrument';
    }

    public connectedCallback(): void {
        super.connectedCallback();
      
        FSComponent.render(<DcduComponent />, document.getElementById('InstrumentContent'));
      }
  }

  
  
  registerInstrument('dcdu-instrument', DcduInstrument);