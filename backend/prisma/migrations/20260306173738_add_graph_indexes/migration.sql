-- CreateIndex
CREATE INDEX "graph_edges_tenant_id_idx" ON "graph_edges"("tenant_id");

-- CreateIndex
CREATE INDEX "graph_edges_source_node_id_idx" ON "graph_edges"("source_node_id");

-- CreateIndex
CREATE INDEX "graph_edges_target_node_id_idx" ON "graph_edges"("target_node_id");

-- CreateIndex
CREATE INDEX "graph_nodes_tenant_id_idx" ON "graph_nodes"("tenant_id");

-- CreateIndex
CREATE INDEX "graph_nodes_reference_id_idx" ON "graph_nodes"("reference_id");
