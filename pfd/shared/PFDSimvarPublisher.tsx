import { EventBus } from "msfssdk/data";
import { SimVarDefinition, SimVarValueType } from "msfssdk/data";
import { SimVarPublisher } from "msfssdk/instruments";
import { Arinc429Word } from "./arinc429";


  export interface PFDSimvars {
    coldDark: number,
    elec: number,
    potentiometer_captain: number;
    pitch: number;
    roll: number;
    heading: number;
    altitude: number;
    speed: number;
    alpha_prot: number;
    onGround: number;
    activeLateralMode: number;
    activeVerticalMode: number;
    fma_mode_reversion: number;
    fma_speed_protection: number;
    AThrMode: number;
    ap_vs_selected: number;
    radio_alt: number;
    approachCapability: number;
    ap1Active: boolean;
    ap2Active: boolean;
    fmaVerticalArmed: number;
    fmaLateralArmed: number;
    fd1Active: boolean;
    fd2Active: boolean;
    athrStatus: number;
    athrModeMessage: number;
    machPreselVal: number;
    speedPreselVal: number;
    mda: number;
    dh: number;
    attHdgKnob: number;
    airKnob: number;
    vs_baro: number;
    vs_inert: number;
    sideStickX: number,
    sideStickY: number,
    fdYawCommand: number,
    fdBank: number,
    fdPitch: number,
    v1: number,
    flightPhase: number,
    hasLoc: boolean;
    hasDme: boolean;
    navIdent: string;
    navFreq: number;
    dme: number;
    navRadialError: number;
    hasGlideslope: boolean;
    glideSlopeError: number;
    markerBeacon: number;
  }
  
  
  export enum PFDVars {
    ColdDark = 'L:A32NX_COLD_AND_DARK_SPAWN',
    elec = 'L:A32NX_ELEC_AC_ESS_BUS_IS_POWERED',
    potentiometer_captain= 'LIGHT POTENTIOMETER:88',
    pitch = 'L:A32NX_ADIRS_IR_1_PITCH',
    roll = 'L:A32NX_ADIRS_IR_1_ROLL',
    heading = 'L:A32NX_ADIRS_IR_1_HEADING',
    altitude = 'L:A32NX_ADIRS_ADR_1_ALTITUDE',
    speed = 'L:A32NX_ADIRS_ADR_1_COMPUTED_AIRSPEED',
    alpha_prot = 'L:A32NX_SPEEDS_ALPHA_PROTECTION',
    onGround = 'SIM ON GROUND',
    activeLateralMode = 'L:A32NX_FMA_LATERAL_MODE',
    activeVerticalMode = 'L:A32NX_FMA_VERTICAL_MODE',
    fma_mode_reversion = 'L:A32NX_FMA_MODE_REVERSION',
    fma_speed_protection = 'L:A32NX_FMA_SPEED_PROTECTION_MODE',
    AThrMode = 'L:A32NX_AUTOTHRUST_MODE',
    ap_vs_selected = 'L:A32NX_AUTOPILOT_VS_SELECTED',
    radio_alt = 'PLANE ALT ABOVE GROUND MINUS CG',
    approachCapability = 'L:A32NX_ApproachCapability',
    ap1Active = 'L:A32NX_AUTOPILOT_1_ACTIVE',
    ap2Active = 'L:A32NX_AUTOPILOT_2_ACTIVE',
    fmaVerticalArmed = 'L:A32NX_FMA_VERTICAL_ARMED',
    fmaLateralArmed = 'L:A32NX_FMA_LATERAL_ARMED',
    fd1Active = 'AUTOPILOT FLIGHT DIRECTOR ACTIVE:1',
    fd2Active = 'AUTOPILOT FLIGHT DIRECTOR ACTIVE:2',
    athrStatus = 'L:A32NX_AUTOTHRUST_STATUS',
    athrModeMessage = 'L:A32NX_AUTOTHRUST_MODE_MESSAGE',
    machPreselVal = 'L:A32NX_MachPreselVal',
    speedPreselVal = 'L:A32NX_SpeedPreselVal',
    mda = 'L:AIRLINER_MINIMUM_DESCENT_ALTITUDE',
    dh = 'L:AIRLINER_DECISION_HEIGHT',
    attHdgKnob = 'L:A32NX_ATT_HDG_SWITCHING_KNOB',
    airKnob = 'L:A32NX_AIR_DATA_SWITCHING_KNOB',
    vs_baro = 'L:A32NX_ADIRS_ADR_1_BAROMETRIC_VERTICAL_SPEED',
    vs_inert = 'L:A32NX_ADIRS_IR_1_VERTICAL_SPEED',
    sideStickX = 'L:A32NX_SIDESTICK_POSITION_X',
    sideStickY = 'L:A32NX_SIDESTICK_POSITION_Y',
    fdYawCommand = 'L:A32NX_FLIGHT_DIRECTOR_YAW',
    fdBank = 'L:A32NX_FLIGHT_DIRECTOR_BANK',
    fdPitch = 'L:A32NX_FLIGHT_DIRECTOR_PITCH',
    v1 = 'L:AIRLINER_V1_SPEED',
    flightPhase = 'L:A32NX_FWC_FLIGHT_PHASE',
    hasLoc = 'NAV HAS LOCALIZER:3',
    hasDme = 'NAV HAS DME:3',
    navIdent = 'NAV IDENT:3',
    navFreq = 'NAV FREQUENCY:3',
    dme = 'NAV DME:3',
    navRadialError = 'NAV RADIAL ERROR:3',
    hasGlideslope = 'NAV HAS GLIDE SLOPE:3',
    glideSlopeError = 'NAV GLIDE SLOPE ERROR:3',
    markerBeacon = 'MARKER BEACON STATE',
  }
  

/** A publisher to poll and publish nav/com simvars. */
export class PFDSimvarPublisher extends SimVarPublisher<PFDSimvars> {
    private static simvars = new Map<keyof PFDSimvars, SimVarDefinition>([
      ['coldDark', { name: PFDVars.ColdDark, type: SimVarValueType.Number }],
      ['elec', { name: PFDVars.elec, type: SimVarValueType.Bool }],
      ['potentiometer_captain', { name: PFDVars.potentiometer_captain, type: SimVarValueType.Number}],
      ['pitch', { name: PFDVars.pitch, type: SimVarValueType.Number}],
      ['roll', { name: PFDVars.roll, type: SimVarValueType.Number}],
      ['heading', { name: PFDVars.heading, type: SimVarValueType.Number}],
      ['altitude', { name: PFDVars.altitude, type: SimVarValueType.Number}],
      ['speed', { name: PFDVars.speed, type: SimVarValueType.Number}],
      ['alpha_prot', { name: PFDVars.alpha_prot, type: SimVarValueType.Number}],
      ['onGround', { name: PFDVars.onGround, type: SimVarValueType.Number}],
      ['activeLateralMode', { name: PFDVars.activeLateralMode, type: SimVarValueType.Number}],
      ['activeVerticalMode', { name: PFDVars.activeVerticalMode, type: SimVarValueType.Number}],
      ['fma_mode_reversion', { name: PFDVars.fma_mode_reversion, type: SimVarValueType.Number}],
      ['fma_speed_protection', { name: PFDVars.fma_speed_protection, type: SimVarValueType.Number}],
      ['AThrMode', { name: PFDVars.AThrMode, type: SimVarValueType.Number}],
      ['ap_vs_selected', { name: PFDVars.ap_vs_selected, type: SimVarValueType.Number}],
      ['radio_alt', { name: PFDVars.radio_alt, type: SimVarValueType.Feet}],
      ['approachCapability', { name: PFDVars.approachCapability, type: SimVarValueType.Number}],
      ['ap1Active', { name: PFDVars.ap1Active, type: SimVarValueType.Bool}],
      ['ap2Active', { name: PFDVars.ap2Active, type: SimVarValueType.Bool}],
      ['fmaVerticalArmed', { name: PFDVars.fmaVerticalArmed, type: SimVarValueType.Number}],
      ['fmaLateralArmed', { name: PFDVars.fmaLateralArmed, type: SimVarValueType.Number}],
      ['fd1Active', { name: PFDVars.fd1Active, type: SimVarValueType.Bool}],
      ['fd2Active', { name: PFDVars.fd2Active, type: SimVarValueType.Bool}],
      ['athrStatus', { name: PFDVars.athrStatus, type: SimVarValueType.Number}],
      ['athrModeMessage', { name: PFDVars.athrModeMessage, type: SimVarValueType.Number}],
      ['machPreselVal', { name: PFDVars.machPreselVal, type: SimVarValueType.Number}],
      ['speedPreselVal', { name: PFDVars.speedPreselVal, type: SimVarValueType.Knots}],
      ['mda', { name: PFDVars.mda, type: SimVarValueType.Feet}],
      ['dh', { name: PFDVars.dh, type: SimVarValueType.Feet}],
      ['attHdgKnob', { name: PFDVars.attHdgKnob, type: SimVarValueType.Enum}],
      ['airKnob', { name: PFDVars.airKnob, type: SimVarValueType.Enum}],
      ['vs_baro', { name: PFDVars.vs_baro, type: SimVarValueType.Number}],
      ['vs_inert', { name: PFDVars.vs_baro, type: SimVarValueType.Number}],
      ['sideStickX', { name: PFDVars.sideStickX, type: SimVarValueType.Number}],
      ['sideStickY', { name: PFDVars.sideStickY, type: SimVarValueType.Number}],
      ['fdYawCommand', { name: PFDVars.fdYawCommand, type: SimVarValueType.Number}],
      ['fdBank', { name: PFDVars.fdBank, type: SimVarValueType.Number}],
      ['fdPitch', { name: PFDVars.fdPitch, type: SimVarValueType.Number}],
      ['v1', { name: PFDVars.v1, type: SimVarValueType.Number}],
      ['flightPhase', { name: PFDVars.flightPhase, type: SimVarValueType.Number}],

      ['hasLoc', { name: PFDVars.hasLoc, type: SimVarValueType.Bool}],
      ['hasDme', { name: PFDVars.hasDme, type: SimVarValueType.Bool}],

      ['navIdent', { name: PFDVars.flightPhase, type: SimVarValueType.String}],

      ['navFreq', { name: PFDVars.flightPhase, type: SimVarValueType.MHz}],

      ['dme', { name: PFDVars.dme, type: SimVarValueType.Number}],

      ['navRadialError', { name: PFDVars.navRadialError, type: SimVarValueType.Degree}],

      ['hasGlideslope', { name: PFDVars.hasGlideslope, type: SimVarValueType.Bool}],

      ['glideSlopeError', { name: PFDVars.glideSlopeError, type: SimVarValueType.Degree}],

      ['markerBeacon', { name: PFDVars.markerBeacon, type: SimVarValueType.Number}],




    ])
  
    /**
     * Create a NavComSimVarPublisher
     * @param bus The EventBus to publish to
     */
    public constructor(bus: EventBus) {
      super(PFDSimvarPublisher.simvars, bus);
    }
  }


