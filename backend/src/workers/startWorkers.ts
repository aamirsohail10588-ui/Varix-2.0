import "./ingestion.worker";
import "./orchestration.worker";
import "./normalization.worker";
import { startSnapshotGraphWorker } from "./snapshotGraph.worker";

console.log("VARIX Workers Running");
startSnapshotGraphWorker();