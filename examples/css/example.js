import "./style.css";
import "./style2.css";
import styles from "./style.module.css";
import("./lazy-style.css");

document.getElementsByTagName("main")[0].className = styles.main;
