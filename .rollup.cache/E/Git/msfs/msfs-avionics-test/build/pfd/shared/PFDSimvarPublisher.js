import { SimVarValueType } from "msfssdk/data";
import { SimVarPublisher } from "msfssdk/instruments";
export var PFDVars;
(function (PFDVars) {
    PFDVars["ColdDark"] = "L:A32NX_COLD_AND_DARK_SPAWN";
    PFDVars["elec"] = "L:A32NX_ELEC_AC_ESS_BUS_IS_POWERED";
    PFDVars["potentiometer_captain"] = "LIGHT POTENTIOMETER:88";
    PFDVars["pitch"] = "L:A32NX_ADIRS_IR_1_PITCH";
    PFDVars["roll"] = "L:A32NX_ADIRS_IR_1_ROLL";
    PFDVars["heading"] = "L:A32NX_ADIRS_IR_1_HEADING";
    PFDVars["altitude"] = "L:A32NX_ADIRS_ADR_1_ALTITUDE";
    PFDVars["speed"] = "L:A32NX_ADIRS_ADR_1_COMPUTED_AIRSPEED";
    PFDVars["alpha_prot"] = "L:A32NX_SPEEDS_ALPHA_PROTECTION";
    PFDVars["onGround"] = "SIM ON GROUND";
    PFDVars["activeLateralMode"] = "L:A32NX_FMA_LATERAL_MODE";
    PFDVars["activeVerticalMode"] = "L:A32NX_FMA_VERTICAL_MODE";
    PFDVars["fma_mode_reversion"] = "L:A32NX_FMA_MODE_REVERSION";
    PFDVars["fma_speed_protection"] = "L:A32NX_FMA_SPEED_PROTECTION_MODE";
    PFDVars["AThrMode"] = "L:A32NX_AUTOTHRUST_MODE";
    PFDVars["ap_vs_selected"] = "L:A32NX_AUTOPILOT_VS_SELECTED";
    PFDVars["radio_alt"] = "PLANE ALT ABOVE GROUND MINUS CG";
    PFDVars["approachCapability"] = "L:A32NX_ApproachCapability";
    PFDVars["ap1Active"] = "L:A32NX_AUTOPILOT_1_ACTIVE";
    PFDVars["ap2Active"] = "L:A32NX_AUTOPILOT_2_ACTIVE";
    PFDVars["fmaVerticalArmed"] = "L:A32NX_FMA_VERTICAL_ARMED";
    PFDVars["fmaLateralArmed"] = "L:A32NX_FMA_LATERAL_ARMED";
    PFDVars["fd1Active"] = "AUTOPILOT FLIGHT DIRECTOR ACTIVE:1";
    PFDVars["fd2Active"] = "AUTOPILOT FLIGHT DIRECTOR ACTIVE:2";
    PFDVars["athrStatus"] = "L:A32NX_AUTOTHRUST_STATUS";
    PFDVars["athrModeMessage"] = "L:A32NX_AUTOTHRUST_MODE_MESSAGE";
    PFDVars["machPreselVal"] = "L:A32NX_MachPreselVal";
    PFDVars["speedPreselVal"] = "L:A32NX_SpeedPreselVal";
    PFDVars["mda"] = "L:AIRLINER_MINIMUM_DESCENT_ALTITUDE";
    PFDVars["dh"] = "L:AIRLINER_DECISION_HEIGHT";
    PFDVars["attHdgKnob"] = "L:A32NX_ATT_HDG_SWITCHING_KNOB";
    PFDVars["airKnob"] = "L:A32NX_AIR_DATA_SWITCHING_KNOB";
    PFDVars["vs_baro"] = "L:A32NX_ADIRS_ADR_1_BAROMETRIC_VERTICAL_SPEED";
    PFDVars["vs_inert"] = "L:A32NX_ADIRS_IR_1_VERTICAL_SPEED";
    PFDVars["sideStickX"] = "L:A32NX_SIDESTICK_POSITION_X";
    PFDVars["sideStickY"] = "L:A32NX_SIDESTICK_POSITION_Y";
    PFDVars["fdYawCommand"] = "L:A32NX_FLIGHT_DIRECTOR_YAW";
    PFDVars["fdBank"] = "L:A32NX_FLIGHT_DIRECTOR_BANK";
    PFDVars["fdPitch"] = "L:A32NX_FLIGHT_DIRECTOR_PITCH";
    PFDVars["v1"] = "L:AIRLINER_V1_SPEED";
    PFDVars["flightPhase"] = "L:A32NX_FWC_FLIGHT_PHASE";
})(PFDVars || (PFDVars = {}));
/** A publisher to poll and publish nav/com simvars. */
export class PFDSimvarPublisher extends SimVarPublisher {
    /**
     * Create a NavComSimVarPublisher
     * @param bus The EventBus to publish to
     */
    constructor(bus) {
        super(PFDSimvarPublisher.simvars, bus);
    }
}
PFDSimvarPublisher.simvars = new Map([
    ['coldDark', { name: PFDVars.ColdDark, type: SimVarValueType.Number }],
    ['elec', { name: PFDVars.elec, type: SimVarValueType.Bool }],
    ['potentiometer_captain', { name: PFDVars.potentiometer_captain, type: SimVarValueType.Number }],
    ['pitch', { name: PFDVars.pitch, type: SimVarValueType.Number }],
    ['roll', { name: PFDVars.roll, type: SimVarValueType.Number }],
    ['heading', { name: PFDVars.heading, type: SimVarValueType.Number }],
    ['altitude', { name: PFDVars.altitude, type: SimVarValueType.Number }],
    ['speed', { name: PFDVars.speed, type: SimVarValueType.Number }],
    ['alpha_prot', { name: PFDVars.alpha_prot, type: SimVarValueType.Number }],
    ['onGround', { name: PFDVars.onGround, type: SimVarValueType.Number }],
    ['activeLateralMode', { name: PFDVars.activeLateralMode, type: SimVarValueType.Number }],
    ['activeVerticalMode', { name: PFDVars.activeVerticalMode, type: SimVarValueType.Number }],
    ['fma_mode_reversion', { name: PFDVars.fma_mode_reversion, type: SimVarValueType.Number }],
    ['fma_speed_protection', { name: PFDVars.fma_speed_protection, type: SimVarValueType.Number }],
    ['AThrMode', { name: PFDVars.AThrMode, type: SimVarValueType.Number }],
    ['ap_vs_selected', { name: PFDVars.ap_vs_selected, type: SimVarValueType.Number }],
    ['radio_alt', { name: PFDVars.radio_alt, type: SimVarValueType.Feet }],
    ['approachCapability', { name: PFDVars.approachCapability, type: SimVarValueType.Number }],
    ['ap1Active', { name: PFDVars.ap1Active, type: SimVarValueType.Bool }],
    ['ap2Active', { name: PFDVars.ap2Active, type: SimVarValueType.Bool }],
    ['fmaVerticalArmed', { name: PFDVars.fmaVerticalArmed, type: SimVarValueType.Number }],
    ['fmaLateralArmed', { name: PFDVars.fmaLateralArmed, type: SimVarValueType.Number }],
    ['fd1Active', { name: PFDVars.fd1Active, type: SimVarValueType.Bool }],
    ['fd2Active', { name: PFDVars.fd2Active, type: SimVarValueType.Bool }],
    ['athrStatus', { name: PFDVars.athrStatus, type: SimVarValueType.Number }],
    ['athrModeMessage', { name: PFDVars.athrModeMessage, type: SimVarValueType.Number }],
    ['machPreselVal', { name: PFDVars.machPreselVal, type: SimVarValueType.Number }],
    ['speedPreselVal', { name: PFDVars.speedPreselVal, type: SimVarValueType.Knots }],
    ['mda', { name: PFDVars.mda, type: SimVarValueType.Feet }],
    ['dh', { name: PFDVars.dh, type: SimVarValueType.Feet }],
    ['attHdgKnob', { name: PFDVars.attHdgKnob, type: SimVarValueType.Enum }],
    ['airKnob', { name: PFDVars.airKnob, type: SimVarValueType.Enum }],
    ['vs_baro', { name: PFDVars.vs_baro, type: SimVarValueType.Number }],
    ['vs_inert', { name: PFDVars.vs_baro, type: SimVarValueType.Number }],
    ['sideStickX', { name: PFDVars.sideStickX, type: SimVarValueType.Number }],
    ['sideStickY', { name: PFDVars.sideStickY, type: SimVarValueType.Number }],
    ['fdYawCommand', { name: PFDVars.fdYawCommand, type: SimVarValueType.Number }],
    ['fdBank', { name: PFDVars.fdBank, type: SimVarValueType.Number }],
    ['fdPitch', { name: PFDVars.fdPitch, type: SimVarValueType.Number }],
    ['v1', { name: PFDVars.v1, type: SimVarValueType.Number }],
    ['flightPhase', { name: PFDVars.flightPhase, type: SimVarValueType.Number }],
]);
//# sourceMappingURL=PFDSimvarPublisher.js.map