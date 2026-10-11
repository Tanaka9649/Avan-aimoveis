"use client";
import { createContext, useContext } from "react";
export const TenantPublicContext = createContext("");
export const useTenantPublicPath = () => useContext(TenantPublicContext);
