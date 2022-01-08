import { FSComponent } from "msfssdk";
import { DcduComponent } from "./DcduComponent";
class DcduInstrument extends BaseInstrument {
    get templateID() {
        return 'dcduinstrument';
    }
    connectedCallback() {
        super.connectedCallback();
        FSComponent.render(FSComponent.buildComponent(DcduComponent, null), document.getElementById('InstrumentContent'));
    }
}
registerInstrument('dcdu-instrument', DcduInstrument);
//# sourceMappingURL=DcduInstrument.js.map