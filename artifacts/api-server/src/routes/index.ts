import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import codegenRouter from "./codegen";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/codegen", codegenRouter);
router.use("/chat", chatRouter);

export default router;
