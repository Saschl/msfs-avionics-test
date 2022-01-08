import { DisplayComponent, FSComponent, Subject } from 'msfssdk';
import { Arinc429Word } from '../shared/arinc429';
const TensDigits = (value) => {
    let text;
    if (value < 0) {
        text = (value + 100).toString();
    }
    else if (value >= 100) {
        text = (value - 100).toString().padEnd(2, '0');
    }
    else {
        text = value.toString().padEnd(2, '0');
    }
    return text;
};
const HundredsDigit = (value) => {
    let text;
    if (value < 0) {
        text = (value + 1).toString();
    }
    else if (value >= 10) {
        text = (value - 10).toString();
    }
    else {
        text = value.toString();
    }
    return text;
};
const ThousandsDigit = (value) => {
    let text;
    if (!Number.isNaN(value)) {
        text = (value % 10).toString();
    }
    else {
        text = '';
    }
    return text;
};
const TenThousandsDigit = (value) => {
    let text;
    if (!Number.isNaN(value)) {
        text = value.toString();
    }
    else {
        text = '';
    }
    return text;
};
export class DigitalAltitudeReadout extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.mda = 0;
        this.isNegativeSub = Subject.create('hidden');
        this.colorSub = Subject.create('');
        this.showZeroSub = Subject.create(false);
        this.tenDigitsSub = Subject.create(0);
        this.hundredsValue = Subject.create(0);
        this.hundredsPosition = Subject.create(0);
        this.thousandsValue = Subject.create(0);
        this.thousandsPosition = Subject.create(0);
        this.tenThousandsValue = Subject.create(0);
        this.tenThousandsPosition = Subject.create(0);
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        const sub = this.props.bus.getSubscriber();
        sub.on('mda').whenChanged().handle(mda => {
            this.mda = mda;
        });
        sub.on('altitude').whenChanged().handle(a => {
            const altitude = new Arinc429Word(a);
            const isNegative = altitude.value < 0;
            this.isNegativeSub.set(isNegative ? 'visible' : 'hidden');
            const color = (this.mda !== 0 && altitude.value < this.mda) ? 'Amber' : 'Green';
            this.colorSub.set(color);
            const absAlt = Math.abs(Math.max(Math.min(altitude.value, 50000), -1500));
            const tensDigits = absAlt % 100;
            this.tenDigitsSub.set(tensDigits);
            const HundredsValue = Math.floor((absAlt / 100) % 10);
            this.hundredsValue.set(HundredsValue);
            let HundredsPosition = 0;
            if (tensDigits > 80) {
                HundredsPosition = tensDigits / 20 - 4;
                this.hundredsPosition.set(HundredsPosition);
            }
            else {
                this.hundredsPosition.set(0);
            }
            const ThousandsValue = Math.floor((absAlt / 1000) % 10);
            this.thousandsValue.set(ThousandsValue);
            let ThousandsPosition = 0;
            if (HundredsValue >= 9) {
                ThousandsPosition = HundredsPosition;
                this.thousandsPosition.set(ThousandsPosition);
            }
            else {
                this.thousandsPosition.set(0);
            }
            const TenThousandsValue = Math.floor((absAlt / 10000) % 10);
            this.tenThousandsValue.set(TenThousandsValue);
            let TenThousandsPosition = 0;
            if (ThousandsValue >= 9) {
                TenThousandsPosition = ThousandsPosition;
            }
            this.tenThousandsPosition.set(TenThousandsPosition);
            const showThousandsZero = TenThousandsValue !== 0;
            this.showZeroSub.set(showThousandsZero);
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { id: "AltReadoutGroup" },
            FSComponent.buildComponent("g", null,
                FSComponent.buildComponent("svg", { x: "117.754", y: "76.3374", width: "13.5", height: "8.9706", viewBox: "0 0 13.5 8.9706" },
                    FSComponent.buildComponent(Drum, { type: 'ten-thousands', position: this.tenThousandsPosition, value: this.tenThousandsValue, color: this.colorSub, showZero: this.showZeroSub, getText: TenThousandsDigit, valueSpacing: 1, distanceSpacing: 7, displayRange: 1, amount: 2 }),
                    FSComponent.buildComponent(Drum, { type: 'thousands', position: this.thousandsPosition, value: this.thousandsValue, color: this.colorSub, showZero: this.showZeroSub, getText: ThousandsDigit, valueSpacing: 1, distanceSpacing: 7, displayRange: 1, amount: 2 }),
                    FSComponent.buildComponent(Drum, { type: 'hundreds', showZero: this.showZeroSub, position: this.hundredsPosition, value: this.hundredsValue, color: this.colorSub, getText: HundredsDigit, valueSpacing: 1, distanceSpacing: 7, displayRange: 1, amount: 10 })),
                FSComponent.buildComponent("svg", { x: "130.85", y: "73.6664", width: "8.8647", height: "14.313", viewBox: "0 0 8.8647 14.313" },
                    FSComponent.buildComponent(Drum, { type: 'tens', amount: 4, showZero: this.showZeroSub, position: this.tenDigitsSub, value: this.tenDigitsSub, color: this.colorSub, getText: TensDigits, valueSpacing: 20, distanceSpacing: 4.7, displayRange: 40 }),
                    "                     ")),
            FSComponent.buildComponent("path", { id: "AltReadoutReducedAccurMarks", class: "NormalStroke Amber", style: { display: 'none' }, d: "m132.61 81.669h4.7345m-4.7345-1.6933h4.7345" }),
            FSComponent.buildComponent("path", { id: "AltReadoutOutline", class: "NormalStroke Yellow", d: "m117.75 76.337h13.096v-2.671h8.8647v14.313h-8.8647v-2.671h-13.096" }),
            FSComponent.buildComponent("g", { id: "AltNegativeText", class: "FontLarge EndAlign", visibility: this.isNegativeSub },
                FSComponent.buildComponent("text", { class: "White", x: "121.46731", y: "78.156288" }, "N"),
                FSComponent.buildComponent("text", { class: "White", x: "121.49069", y: "83.301224" }, "E"),
                FSComponent.buildComponent("text", { class: "White", x: "121.46731", y: "88.446159" }, "G"))));
    }
}
class Drum extends DisplayComponent {
    constructor() {
        super(...arguments);
        this.digitRefElements = [];
        this.visible = 1;
        this.position = 0;
        this.value = 0;
        this.color = 'Green';
        this.showZero = true;
        this.gRef = FSComponent.createRef();
    }
    buildElements(amount) {
        let highestPosition = Math.round((this.position + this.props.displayRange) / this.props.valueSpacing) * this.props.valueSpacing;
        let highestValue = Math.round((this.value + this.props.displayRange) / this.props.valueSpacing) * this.props.valueSpacing;
        const graduationElements = [];
        for (let i = 0; i < amount; i++) {
            const elementPosition = highestPosition - i * this.props.valueSpacing;
            const offset = -elementPosition * this.props.distanceSpacing / this.props.valueSpacing;
            let elementVal = highestValue - i * this.props.valueSpacing;
            if (!this.showZero && elementVal === 0) {
                elementVal = NaN;
            }
            //graduationElements.push(this.props.elementFunction(elementVal, offset, this.color));
            const digitRef = FSComponent.createRef();
            if (this.props.type === 'hundreds') {
                graduationElements.push(FSComponent.buildComponent("text", { ref: digitRef, transform: `translate(0 ${offset})`, class: `FontLargest MiddleAlign ${this.color}`, x: "11.431", y: "7.1" }));
            }
            else if (this.props.type === 'thousands') {
                graduationElements.push(FSComponent.buildComponent("text", { ref: digitRef, transform: `translate(0 ${offset})`, class: `FontLargest MiddleAlign ${this.color}`, x: "6.98", y: "7.1" }));
            }
            else if (this.props.type === 'ten-thousands') {
                graduationElements.push(FSComponent.buildComponent("text", { ref: digitRef, transform: `translate(0 ${offset})`, class: `FontLargest MiddleAlign ${this.color}`, x: "2.298", y: "7.1" }));
            }
            else if (this.props.type === 'tens') {
                graduationElements.push(FSComponent.buildComponent("text", { ref: digitRef, transform: `translate(0 ${offset})`, class: `FontSmallest MiddleAlign ${this.color}`, x: "4.3894", y: "8.9133" }));
            }
            this.digitRefElements.push(digitRef);
        }
        return graduationElements;
    }
    /*  private getAttributes() {
         const numTicks = Math.round(this.props.displayRange * 2 / this.props.valueSpacing);
 
         let highestPosition = Math.round((this.position + this.props.displayRange) / this.props.valueSpacing) * this.props.valueSpacing;
         if (highestPosition > this.position + this.props.displayRange) {
             highestPosition -= this.props.valueSpacing;
         }
     
         let highestValue = Math.round((this.value + this.props.displayRange) / this.props.valueSpacing) * this.props.valueSpacing;
         if (highestValue > this.value + this.props.displayRange) {
             highestValue -= this.props.valueSpacing;
         }
         
         
     } */
    getOffset(position) {
        const className = `translate(0 ${position * this.props.distanceSpacing / this.props.valueSpacing})`;
        this.gRef.instance.setAttribute('transform', className);
    }
    updateValue() {
        let highestPosition = Math.round((this.position + this.props.displayRange) / this.props.valueSpacing) * this.props.valueSpacing;
        if (highestPosition > this.position + this.props.displayRange) {
            highestPosition -= this.props.valueSpacing;
        }
        let highestValue = Math.round((this.value + this.props.displayRange) / this.props.valueSpacing) * this.props.valueSpacing;
        if (highestValue > this.value + this.props.displayRange) {
            highestValue -= this.props.valueSpacing;
        }
        for (let i = 0; i < this.props.amount; i++) {
            let elementVal = highestValue - i * this.props.valueSpacing;
            const elementPosition = highestPosition - i * this.props.valueSpacing;
            const offset = -elementPosition * this.props.distanceSpacing / this.props.valueSpacing;
            if (!this.showZero && elementVal === 0) {
                elementVal = NaN;
            }
            let text;
            text = this.props.getText(elementVal);
            /*   if(offset > 130 && offset > 40) {
                  this.digitRefElements[i].instance.textContent = text;
                  this.digitRefElements[i].instance.setAttribute('transform', `translate(0 ${offset})`);
              } else {
                  if(offset <=130 && offset < 40) {
                      this.digitRefElements[i].instance.textContent = text;
                      this.digitRefElements[i].instance.setAttribute('transform', `translate(0 ${offset})`);
                  }
              } */
            this.digitRefElements[i].instance.setAttribute('transform', `translate(0 ${offset})`);
            this.digitRefElements[i].instance.textContent = text;
            this.digitRefElements[i].instance.classList.replace('Green', this.color);
            this.digitRefElements[i].instance.classList.replace('Amber', this.color);
        }
    }
    onAfterRender(node) {
        super.onAfterRender(node);
        this.props.position.sub(p => {
            this.position = p;
            // this.getOffset();
            //this.updateValue();
            this.getOffset(p);
            //this.updateValue();
        });
        this.props.value.sub(p => {
            this.value = p;
            this.updateValue();
            //this.getOffset(this.position);
        });
        this.props.color.sub(p => {
            this.color = p;
        });
        this.props.showZero.sub(p => {
            this.showZero = p;
        });
    }
    render() {
        return (FSComponent.buildComponent("g", { ref: this.gRef }, this.buildElements(this.props.amount)));
    }
}
;
//# sourceMappingURL=DigitalAltitudeReadout.js.map