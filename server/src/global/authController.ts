/**
 * Definition of the functions required for authentification and authorization
 */
import jwt = require("jsonwebtoken");
import fs = require("fs");

import {Request, Response, NextFunction} from "express";
import * as globalTypes from "./globalTypes";

const JWTKeys = {
  public: fs.readFileSync(process.env.JWT_PUBLIC),
  private: fs.readFileSync(process.env.JWT_PRIVATE)
};

const JWTSignOptions: jwt.SignOptions = {
  expiresIn: 60*60, // Expires in 1 hour
  algorithm: "RS256"
};

const JWTVerifyOptions:jwt.VerifyOptions = {
  algorithms: ["RS256"]
};

/**
 * Generates JWT based on query results for the login process
 * @param payload object containing non sensitive user data
 */
export const generateJWT = (payload: globalTypes.JWTPayload): string => {
  return jwt.sign(payload, JWTKeys.private, JWTSignOptions);
};

/**
 * Verifies recived JWT from the user and returnes decoded payload or false
 * @param token JWT sent with the users request
 */
export const verifyJWT = (token: string): null | globalTypes.JWTPayload => {
  try {
    return jwt.verify(token, JWTKeys.public, JWTVerifyOptions) as globalTypes.JWTPayload;
  }
  catch (err) {
    return null;
  }
};

/**
 * Verifies JWT and protects following routes from unauthorised access
 */
export const protectRoutes = (req: Request, res: Response, next: NextFunction) => {
  const jwtData = verifyJWT(req.headers.authorization.replace("Bearer ", ""));
  if (req.headers.authorization && jwtData !== null) {
    res.locals.memberID = jwtData.mitgliedID;
    res.locals.permissions = jwtData.permissions;
    next();
  } else {
    return res.status(401).send("Authentication failed: Please log in");
  }
};

/**
 * Checks if memberID equals ressource id or member has specified permission
 * to grant access to ressource
 */
export const restrictRoutesSelfOrPermission = (permissions: number[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const jwtData = verifyJWT(req.headers.authorization.replace("Bearer ", ""));
    if (Number(req.params.id) === jwtData.mitgliedID ||
       permissions.every(element => jwtData.permissions.includes(element))) {
        res.locals.memberID = jwtData.mitgliedID;
        res.locals.permissions = jwtData.permissions;
        next();
       } else {
        return res.status(403).send("Authorization failed: You are not permitted to do this");
       }
  };
};

/**
 * Checks if user has the right permissions to use the following routes
 * Every permission in the permissions array needs to be included in the permissions
 * of the received jwt
 * @param permissions Array of permissions which are allowed to use following routes
 */
export const restrictRoutes = (permissions: number[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const jwtDataPermissions = verifyJWT(req.headers.authorization.replace("Bearer ", "")).permissions;
    if(permissions.every(element => jwtDataPermissions.includes(element))) {
      next();
    } else {
      return res.status(403).send("Authorization failed: You are not permitted to do this");
    }
  };
};