import {Notice} from "obsidian";
import t from "../l10n/locale";

export function parseFrontmatterLocation(frontmatterLocationField: unknown, fileBasename: string): Array<[number, number]> {
    if (typeof frontmatterLocationField === "string") {
        // Try parsing as a number pair
        const parseResult = /(?:\[|^)([+-]?\d+(?:\.\d+)?)%?\s*,\s*([+-]?\d+(?:\.\d+)?)%?(?:]|$)/.exec(frontmatterLocationField);
        if (parseResult != null) {
            const lat = Number(parseResult[1]), long = Number(parseResult[2]);
            if (!isNaN(lat) && !isNaN(long)) {
                return [[lat, long]];
            }
        }
    }
    if (typeof frontmatterLocationField === "object" && Array.isArray(frontmatterLocationField)) {
        let twoDLocationsArray: Array<Array<unknown>>;
        if (!Array.isArray(frontmatterLocationField[0])) {
            twoDLocationsArray = [frontmatterLocationField];
        } else {
            twoDLocationsArray = frontmatterLocationField;
        }
        const outputArray: Array<[number, number]> = [];
        for (const location of twoDLocationsArray) {
            let [lat, long] = location.map((value) => {
                if (typeof value === "number") return value;
                if (typeof value === "string") return Number(value.split("%").shift());
                return Number.NaN;
            });
            if (isNaN(lat) || isNaN(long)) {
                new Notice(
                    t(
                        "Could not parse location in %1",
                        fileBasename
                    )
                );
            } else {
                outputArray.push([lat, long]);
            }
        }
        return outputArray;
    }
    return [];
}