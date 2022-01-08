import { SimVarValueType } from "msfssdk";
export class AdirsValueProvider {
    constructor(bus, pfdSimvar) {
        const sub = bus.getSubscriber();
        const url = document.getElementsByTagName('a32nx-pfd')[0].getAttribute('url');
        const displayIndex = url ? parseInt(url.substring(url.length - 1), 10) : 0;
        sub.on('attHdgKnob').whenChanged().handle(k => {
            const inertialSource = getSupplier(displayIndex, k);
            pfdSimvar.updateSimVarSource('vs_inert', { name: `L:A32NX_ADIRS_IR_${inertialSource}_VERTICAL_SPEED`, type: SimVarValueType.Number });
            pfdSimvar.updateSimVarSource('pitch', { name: `L:A32NX_ADIRS_IR_${inertialSource}_PITCH`, type: SimVarValueType.Number });
            pfdSimvar.updateSimVarSource('roll', { name: `L:A32NX_ADIRS_IR_${inertialSource}_ROLL`, type: SimVarValueType.Number });
            pfdSimvar.updateSimVarSource('heading', { name: `L:A32NX_ADIRS_IR_${inertialSource}_HEADING`, type: SimVarValueType.Number });
        });
        sub.on('airKnob').whenChanged().handle(a => {
            const airSource = getSupplier(displayIndex, a);
            pfdSimvar.updateSimVarSource('speed', { name: `L:A32NX_ADIRS_ADR_${airSource}_COMPUTED_AIRSPEED`, type: SimVarValueType.Number });
            pfdSimvar.updateSimVarSource('vs_baro', { name: `L:A32NX_ADIRS_ADR_${airSource}_BAROMETRIC_VERTICAL_SPEED`, type: SimVarValueType.Number });
            pfdSimvar.updateSimVarSource('altitude', { name: `L:A32NX_ADIRS_ADR_${airSource}_ALTITUDE`, type: SimVarValueType.Number });
        });
    }
}
const isCaptainSide = (displayIndex) => displayIndex === 1;
const getSupplier = (displayIndex, knobValue) => {
    const adirs3ToCaptain = 0;
    const adirs3ToFO = 2;
    if (isCaptainSide(displayIndex)) {
        return knobValue === adirs3ToCaptain ? 3 : 1;
    }
    return knobValue === adirs3ToFO ? 3 : 2;
};
//# sourceMappingURL=AdirsValueProvider.js.map