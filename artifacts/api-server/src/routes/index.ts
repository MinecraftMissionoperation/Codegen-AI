import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import codegenRouter from "./codegen";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/codegen", codegenRouter);

export default router;
