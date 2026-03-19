import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import projectsRouter from "./projects";
import tasksRouter from "./tasks";
import formulationsRouter from "./formulations";
import analyticsRouter from "./analytics";
import notificationsRouter from "./notifications";
import activityRouter from "./activity";
import searchRouter from "./search";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/projects", projectsRouter);
router.use("/tasks", tasksRouter);
router.use("/formulations", formulationsRouter);
router.use("/analytics", analyticsRouter);
router.use("/notifications", notificationsRouter);
router.use("/activity", activityRouter);
router.use("/search", searchRouter);

export default router;
