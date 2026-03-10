-- CreateIndex
CREATE INDEX "control_results_controlRunId_idx" ON "control_results"("controlRunId");

-- CreateIndex
CREATE INDEX "control_results_control_id_idx" ON "control_results"("control_id");

-- CreateIndex
CREATE INDEX "control_results_entity_reference_idx" ON "control_results"("entity_reference");
