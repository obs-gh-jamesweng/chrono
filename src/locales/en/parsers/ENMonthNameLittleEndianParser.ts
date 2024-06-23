import { findYearClosestToReference } from "../../../calculation/years";
import { ParsingContext } from "../../../chrono";
import { AbstractParserWithWordBoundaryChecking } from "../../../common/parsers/AbstractParserWithWordBoundary";
import { matchAnyPattern } from "../../../utils/pattern";
import {
  MONTH_DICTIONARY,
  ORDINAL_NUMBER_PATTERN,
  YEAR_PATTERN,
  parseOrdinalNumberPattern,
  parseYear,
} from "../constants";

// prettier-ignore
const PATTERN = new RegExp(
    `(?:on\\s{0,3})?` +
        `(${ORDINAL_NUMBER_PATTERN})` +
        `(?:` +
            `\\s{0,3}(?:to|\\-|\\–|until|through|till)?\\s{0,3}` +
            `(${ORDINAL_NUMBER_PATTERN})` +
        ")?" +
        `(?:-|/|\\s{0,3}(?:of)?\\s{0,3})` +
        `(${matchAnyPattern(MONTH_DICTIONARY)})` +
        "(?:" +
            `(?:-|/|,?\\s{0,3})` +
            `(${YEAR_PATTERN}(?!\\w))` +
        ")?" +
        "(?=\\W|$)",
    "i"
);

const DATE_GROUP = 1;
const DATE_TO_GROUP = 2;
const MONTH_NAME_GROUP = 3;
const YEAR_GROUP = 4;

export default class ENMonthNameLittleEndianParser extends AbstractParserWithWordBoundaryChecking {
  innerPattern(): RegExp {
    return PATTERN;
  }

  innerExtract(context: ParsingContext, match: RegExpMatchArray) {
    const result = context.createParsingResult(match.index!, match[0]);

    const month = MONTH_DICTIONARY[match[MONTH_NAME_GROUP]!.toLowerCase()]!;
    const day = parseOrdinalNumberPattern(match[DATE_GROUP]!);
    if (day > 31) {
      // e.g. "[96 Aug]" => "9[6 Aug]", we need to shift away from the next number
      match.index = match.index! + match[DATE_GROUP]!.length;
      return undefined;
    }

    result.start.assign("month", month);
    result.start.assign("day", day);

    if (match[YEAR_GROUP]) {
      const yearNumber = parseYear(match[YEAR_GROUP]);
      result.start.assign("year", yearNumber);
    } else {
      const year = findYearClosestToReference(context.reference, day, month);
      result.start.imply("year", year);
    }

    if (match[DATE_TO_GROUP]) {
      const endDate = parseOrdinalNumberPattern(match[DATE_TO_GROUP]);

      result.end = result.start.clone();
      result.end.assign("day", endDate);
    }

    return result;
  }
}
