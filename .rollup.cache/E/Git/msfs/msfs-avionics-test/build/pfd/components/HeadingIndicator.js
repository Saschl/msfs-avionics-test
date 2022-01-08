import { HorizontalTape } from './PFDUtils';
import { DisplayComponent, FSComponent } from 'msfssdk';
import { getSmallestAngle } from '../shared/utils';
const DisplayRange = 24;
const DistanceSpacing = 7.555;
const ValueSpacing = 5;
class GraduationElement extends DisplayComponent {
    render() {
        let text = '';
        let classText = '';
        let tickLength = 3.8302;
        let textYPos;
        const roundedHeading = Math.round(this.props.heading);
        if (roundedHeading % 10 === 0) {
            if (roundedHeading % 30 === 0) {
                classText = 'FontMedium';
                textYPos = 154.64206;
            }
            else {
                classText = 'FontSmallest';
                textYPos = 154.27985;
            }
            let textVal = Math.round(this.props.heading / 10) % 36;
            if (textVal < 0) {
                textVal += 36;
            }
            text = textVal.toString();
        }
        else {
            tickLength *= 0.42;
        }
        return (FSComponent.buildComponent("g", { id: "HeadingTick", transform: `translate(${this.props.offset} 0)` },
            FSComponent.buildComponent("path", { class: "NormalStroke White", d: `m68.913 145.34v${tickLength}` }),
            FSComponent.buildComponent("text", { id: "HeadingLabel", class: `White MiddleAlign ${classText}`, x: "68.879425", y: textYPos }, text)));
    }
}
;
export class HeadingTape extends DisplayComponent {
    render() {
        /*        if (!this.props.heading.isNormalOperation()) {
                   return <></>;
               }
             */
        const bugs = [];
        return (FSComponent.buildComponent("g", null,
            FSComponent.buildComponent("path", { id: "HeadingTapeBackground", d: "m32.138 145.34h73.536v10.382h-73.536z", class: "TapeBackground" }),
            FSComponent.buildComponent(HorizontalTape
            /* graduationElementFunction={GraduationElement} */
            , { 
                /* graduationElementFunction={GraduationElement} */
                bus: this.props.bus, bugs: bugs, displayRange: DisplayRange + 3, valueSpacing: ValueSpacing, distanceSpacing: DistanceSpacing })));
    }
}
export const HeadingOfftape = ({ selectedHeading, heading, ILSCourse, groundTrack }) => {
    if (!heading.isNormalOperation()) {
        return (FSComponent.buildComponent(FSComponent.Fragment, null,
            FSComponent.buildComponent("path", { id: "HeadingTapeBackground", d: "m32.138 145.34h73.536v10.382h-73.536z", class: "TapeBackground" }),
            FSComponent.buildComponent("path", { id: "HeadingTapeOutline", class: "NormalStroke Red", d: "m32.138 156.23v-10.886h73.536v10.886" }),
            FSComponent.buildComponent("text", { id: "HDGFailText", class: "Blink9Seconds FontLargest EndAlign Red", x: "75.926208", y: "151.95506" }, "HDG")));
    }
    return (FSComponent.buildComponent("g", { id: "HeadingOfftapeGroup" },
        FSComponent.buildComponent("path", { id: "HeadingTapeOutline", class: "NormalStroke White", d: "m32.138 156.23v-10.886h73.536v10.886" }),
        FSComponent.buildComponent(SelectedHeading, { heading: heading, selectedHeading: selectedHeading }),
        FSComponent.buildComponent(QFUIndicator, { heading: heading, ILSCourse: ILSCourse }),
        FSComponent.buildComponent("path", { class: "Fill Yellow", d: "m69.61 147.31h-1.5119v-8.0635h1.5119z" }),
        groundTrack.isNormalOperation() ? FSComponent.buildComponent(GroundTrackBug, { groundTrack: groundTrack, heading: heading }) : null));
};
const SelectedHeading = ({ selectedHeading, heading }) => {
    if (Number.isNaN(selectedHeading)) {
        return null;
    }
    const headingDelta = getSmallestAngle(selectedHeading, heading.value);
    const text = Math.round(selectedHeading).toString().padStart(3, '0');
    if (Math.abs(headingDelta) < DisplayRange) {
        const offset = headingDelta * DistanceSpacing / ValueSpacing;
        return (FSComponent.buildComponent("path", { id: "HeadingTargetIndicator", class: "NormalStroke Cyan CornerRound", transform: `translate(${offset} 0)`, d: "m69.978 145.1 1.9501-5.3609h-6.0441l1.9501 5.3609" }));
    }
    if (headingDelta > 0) {
        return (FSComponent.buildComponent("text", { id: "SelectedHeadingTextRight", class: "FontSmallest MiddleAlign Cyan", x: "101.56478", y: "144.44759" }, text));
    }
    return (FSComponent.buildComponent("text", { id: "SelectedHeadingTextLeft", class: "FontSmallest MiddleAlign Cyan", x: "36.20676", y: "144.44794" }, text));
};
const GroundTrackBug = ({ heading, groundTrack }) => {
    const offset = getSmallestAngle(groundTrack.value, heading.value) * DistanceSpacing / ValueSpacing;
    return (FSComponent.buildComponent("g", { id: "ActualTrackIndicator", transform: `translate(${offset} 0)` },
        FSComponent.buildComponent("path", { class: "ThickOutline CornerRound", d: "m68.906 145.75-1.2592 1.7639 1.2592 1.7639 1.2592-1.7639z" }),
        FSComponent.buildComponent("path", { class: "ThickStroke Green CornerRound", d: "m68.906 145.75-1.2592 1.7639 1.2592 1.7639 1.2592-1.7639z" })));
};
const QFUIndicator = ({ ILSCourse, heading }) => {
    if (ILSCourse < 0) {
        return null;
    }
    const delta = getSmallestAngle(ILSCourse, heading.value);
    const text = Math.round(ILSCourse).toString().padStart(3, '0');
    if (Math.abs(delta) > DisplayRange) {
        if (delta > 0) {
            return (FSComponent.buildComponent("g", { id: "ILSCourseRight" },
                FSComponent.buildComponent("path", { class: "BlackFill NormalStroke White", d: "m100.57 149.68h12.088v6.5516h-12.088z" }),
                FSComponent.buildComponent("text", { id: "ILSCourseTextRight", class: "FontMedium MiddleAlign Magenta", x: "106.58398", y: "155.12291" }, text)));
        }
        return (FSComponent.buildComponent("g", { id: "ILSCourseLeft" },
            FSComponent.buildComponent("path", { class: "BlackFill NormalStroke White", d: "m26.094 156.18v-6.5516h12.088v6.5516z" }),
            FSComponent.buildComponent("text", { id: "ILSCourseTextLeft", class: "FontMedium MiddleAlign Magenta", x: "32.06773", y: "155.12303" }, text)));
    }
    const offset = getSmallestAngle(ILSCourse, heading.value) * DistanceSpacing / ValueSpacing;
    return (FSComponent.buildComponent("g", { id: "ILSCoursePointer", transform: `translate(${offset} 0)` },
        FSComponent.buildComponent("path", { class: "ThickOutline", d: "m66.992 152.82h3.8279m-1.914-6.5471v9.4518" }),
        FSComponent.buildComponent("path", { class: "ThickStroke Magenta", d: "m66.992 152.82h3.8279m-1.914-6.5471v9.4518" })));
};
//# sourceMappingURL=HeadingIndicator.js.map