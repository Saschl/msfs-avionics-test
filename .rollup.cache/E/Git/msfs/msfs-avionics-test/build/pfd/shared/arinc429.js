export class Arinc429WordSsmParseError extends Error {
    constructor(ssm) {
        super();
        this.ssm = ssm;
    }
}
export class Arinc429Word {
    constructor(word) {
        Arinc429Word.f64View[0] = word;
        const ssm = Arinc429Word.u32View[0];
        if (ssm >= 0b00 && ssm <= 0b11) {
            this.ssm = ssm;
        }
        else {
            throw new Arinc429WordSsmParseError(ssm);
        }
        this.value = Arinc429Word.f32View[1];
    }
    static empty() {
        return new Arinc429Word(0);
    }
    static fromSimVarValue(name) {
        return new Arinc429Word(SimVar.GetSimVarValue(name, 'number'));
    }
    isFailureWarning() {
        return this.ssm === Arinc429Word.SignStatusMatrix.FailureWarning;
    }
    isNoComputedData() {
        return this.ssm === Arinc429Word.SignStatusMatrix.NoComputedData;
    }
    isFunctionalTest() {
        return this.ssm === Arinc429Word.SignStatusMatrix.FunctionalTest;
    }
    isNormalOperation() {
        return this.ssm === Arinc429Word.SignStatusMatrix.NormalOperation;
    }
    /**
     * Returns the value when normal operation, the supplied default value otherwise.
     */
    valueOr(defaultValue) {
        return this.isNormalOperation() ? this.value : defaultValue;
    }
}
Arinc429Word.SignStatusMatrix = Object.freeze({
    FailureWarning: 0b00,
    NoComputedData: 0b01,
    FunctionalTest: 0b10,
    NormalOperation: 0b11,
});
Arinc429Word.f64View = new Float64Array(1);
Arinc429Word.u32View = new Uint32Array(Arinc429Word.f64View.buffer);
Arinc429Word.f32View = new Float32Array(Arinc429Word.f64View.buffer);
//# sourceMappingURL=arinc429.js.map