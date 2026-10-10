import { createContext, useContext } from "react";
import { MESSAGES, type Messages } from "./index";

/** The interface language is truly global state, so it travels by context. */
export const I18nContext = createContext<Messages>(MESSAGES.en);

export const useI18n = (): Messages => useContext(I18nContext);
