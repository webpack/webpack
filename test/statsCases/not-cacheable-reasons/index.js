import { cleared } from "./cleared";
import defined from "./defined";
import { value } from "./flagged";
import { other } from "./host-flagged";
import imported from "./imported";

export default value + other + cleared + imported + defined;
