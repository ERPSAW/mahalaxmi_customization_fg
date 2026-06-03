// frappe.ui.form.on('Stock Entry', {
//     setup(frm) {
//         console.log("=================");
//         frm._freeze_fg_qty = frm.doc.fg_completed_qty || 0;
//     },

//     refresh(frm) {
//         frm.set_df_property('fg_completed_qty', 'read_only', 0);
//         frm._freeze_fg_qty = frm.doc.fg_completed_qty || 0;
//         update_process_loss(frm);

//         setTimeout(function() {
//             calculate_all(frm);
//         }, 500);

//         // New document + Work Order available
//         if (frm.doc.__islocal == 1 && frm.doc.work_order) {
//             let promises = (frm.doc.items || []).map(function(row) {
//                 if (row.item_code) {
//                     return frappe.db.get_value("Item", row.item_code, "custom_is_byproduct_item")
//                         .then(function(r) {
//                             if (r && r.message) {
//                                 return frappe.model.set_value(
//                                     row.doctype,
//                                     row.name,
//                                     "custom_is_byproduct_item",
//                                     r.message.custom_is_byproduct_item ? 1 : 0
//                                 );
//                             }
//                         });
//                 }
//                 return Promise.resolve();
//             });
//             Promise.all(promises).then(function() {
//                 frm.refresh_field("items");
//             });
//         }
//     },

//     onload(frm) {
//         setTimeout(function() {
//             calculate_all(frm);
//         }, 800);
//     },

//     onload_post_render(frm) {
//         calculate_all(frm);
//     },

//     stock_entry_type(frm) {
//         calculate_all(frm);
//     },

//     fg_completed_qty(frm) {
//         frm._freeze_fg_qty = flt(frm.doc.fg_completed_qty);
//         update_process_loss(frm);
//     }
// });

// // =============================================
// // STOCK ENTRY DETAIL - CHILD TABLE EVENTS
// // =============================================
// frappe.ui.form.on('Stock Entry Detail', {
//     qty(frm, cdt, cdn) {
//         update_process_loss(frm);
//         calculate_all(frm);
//     },

//     s_warehouse(frm, cdt, cdn) {
//         calculate_all(frm);
//     },

//     t_warehouse(frm, cdt, cdn) {
//         calculate_all(frm);

//         // is_scrap_item logic
//         let row = locals[cdt][cdn];
//         if (row.t_warehouse) {
//             frappe.model.set_value(cdt, cdn, "is_scrap_item", 1);
//         } else {
//             frappe.model.set_value(cdt, cdn, "is_scrap_item", 0);
//         }
//         frm.refresh_field("items");
//     },

//     is_finished_item(frm, cdt, cdn) {
//         calculate_all(frm);
//     },

//     custom_is_byproduct_item(frm, cdt, cdn) {
//         calculate_all(frm);
//     },

//     items_remove(frm) {
//         update_process_loss(frm);
//         calculate_all(frm);
//     }
// });

// // =============================================
// // PROCESS LOSS - FREEZE FG QTY LOGIC
// // =============================================
// function update_process_loss(frm) {
//     let finished_qty = 0;

//     (frm.doc.items || []).forEach(row => {
//         if (row.is_finished_item) {
//             finished_qty += flt(row.qty);
//         }
//     });

//     let fg_qty = flt(frm._freeze_fg_qty || frm.doc.fg_completed_qty);

//     // fg_completed_qty freeze rakho
//     frm.doc.fg_completed_qty = fg_qty;
//     frm.refresh_field('fg_completed_qty');

//     // process_loss_qty = fg_completed_qty - finished item qty
//     let process_loss = fg_qty - finished_qty;
//     frm.doc.process_loss_qty = flt(process_loss, 3);
//     frm.refresh_field('process_loss_qty');

//     // process_loss_percentage = (process_loss_qty / fg_completed_qty) * 100
//     let loss_percentage = 0;
//     if (fg_qty > 0) {
//         loss_percentage = (process_loss / fg_qty) * 100;
//     }
//     frm.doc.process_loss_percentage = flt(loss_percentage, 2);
//     frm.refresh_field('process_loss_percentage');
// }

// // =============================================
// // CALCULATE ALL - MANUFACTURE ENTRY ONLY
// // =============================================
// function calculate_all(frm) {
//     if (frm.doc.stock_entry_type !== 'Manufacture') return;
//     set_production_quantity(frm);
//     set_byproduct_input(frm);
//     set_byproduct_output(frm);
//     set_finished_goods_quantity(frm);
//     set_total_material_consumption(frm);
//     set_total_output(frm);
//     set_grinding_loss(frm);
// }

// // -----------------------------
// // Production Quantity
// // -----------------------------
// function set_production_quantity(frm) {
//     let total_qty = 0;
//     (frm.doc.items || []).forEach(function(row) {
//         if (row.s_warehouse && !row.custom_is_byproduct_item) {
//             total_qty += flt(row.qty);
//         }
//     });
//     frm.set_value('custom_production_quantity_kg', flt(total_qty, 3));
// }

// // -----------------------------
// // By Product Input
// // -----------------------------
// function set_byproduct_input(frm) {
//     let byproduct_qty = 0;
//     (frm.doc.items || []).forEach(function(row) {
//         if (row.s_warehouse && row.custom_is_byproduct_item) {
//             byproduct_qty += flt(row.qty);
//         }
//     });
//     frm.set_value('custom_by_product_in_kg', flt(byproduct_qty, 3));
// }

// // -----------------------------
// // By Product Output
// // -----------------------------
// function set_byproduct_output(frm) {
//     let byproduct_output_qty = 0;
//     (frm.doc.items || []).forEach(function(row) {
//         if (row.t_warehouse && row.custom_is_byproduct_item) {
//             byproduct_output_qty += flt(row.qty);
//         }
//     });
//     frm.set_value('custom_by_product_out_kg', flt(byproduct_output_qty, 3));
// }

// // -----------------------------
// // Finished Goods Quantity
// // -----------------------------
// function set_finished_goods_quantity(frm) {
//     let finished_qty = 0;
//     (frm.doc.items || []).forEach(function(row) {
//         if (row.t_warehouse && row.is_finished_item) {
//             finished_qty += flt(row.qty);
//         }
//     });
//     frm.set_value('custom_finished_goods_out_kg', flt(finished_qty, 3));
// }

// // -----------------------------
// // Total Material Consumption
// // -----------------------------
// function set_total_material_consumption(frm) {
//     let total =
//         flt(frm.doc.custom_production_quantity_kg) +
//         flt(frm.doc.custom_by_product_in_kg);
//     frm.set_value('custom_total_material_in_bp_kg_consumption', flt(total, 3));
// }

// // -----------------------------
// // Total Output
// // -----------------------------
// function set_total_output(frm) {
//     let total =
//         flt(frm.doc.custom_finished_goods_out_kg) +
//         flt(frm.doc.custom_by_product_out_kg);
//     frm.set_value('custom_total_output_kg', flt(total, 3));
// }

// // -----------------------------
// // Grinding Loss
// // -----------------------------
// function set_grinding_loss(frm) {
//     let consumption = flt(frm.doc.custom_total_material_in_bp_kg_consumption);
//     let output = flt(frm.doc.custom_total_output_kg);

//     // Grinding Loss KG
//     let loss = consumption - output;
//     frm.set_value('custom_grinding_loss_kg', flt(loss, 3));

//     // Grinding Loss %
//     let loss_percentage = 0;
//     if (consumption > 0) {
//         loss_percentage = (loss / consumption) * 100;
//     }
//     frm.set_value('custom_grinding_loss_', flt(loss_percentage, 2));
// }


// frappe.ui.form.on('Stock Entry', {

//     onload(frm) {
//         refresh_all_rows(frm);
//     },

//     validate(frm) {
//         calculate_pm_cost(frm);
//         calculate_all(frm);

//         (frm.doc.items || []).forEach(function(row) {

//             // 🔒 LOCK
//             if (row.custom_is_packaging_material) return;

//             let basic_rate = flt(row.basic_rate);
//             if (basic_rate > 0) {
//                 frappe.model.set_value(
//                     row.doctype,
//                     row.name,
//                     'custom_final_rate_after_loss',
//                     basic_rate
//                 );
//             }
//         });
//     },

//     items_add(frm) {
//         calculate_pm_cost(frm);
//         calculate_totals(frm);
//     },

//     custom_process_loss_quantity(frm) {
//         calculate_process_loss(frm);
//         calculate_distribution(frm);
//     },

//     custom_total_outgoing_kg_sfg__(frm) {
//         calculate_process_loss(frm);
//     },

//     custom_packaging_loss_amount(frm) {
//         calculate_distribution(frm);
//     },

//     custom_is_packaging_loss(frm) {
//         frm.doc.items.forEach(function(row) {
//             frappe.model.set_value(
//                 row.doctype,
//                 row.name,
//                 'custom_process_loss',
//                 frm.doc.custom_is_packaging_loss ? 1 : 0
//             );
//         });
//         frm.refresh_field('items');
//     }

// });


// // =======================
// // CHILD TABLE
// // =======================
// frappe.ui.form.on('Stock Entry Detail', {

//     item_code(frm, cdt, cdn) {
//         set_sfg_batch_to_fg(frm);
//         calculate_pm_cost(frm);

//         let items = frm.doc.items || [];

//         if (items.length > 1) {
//             let first_row_rate = flt(items[0].basic_rate);

//             items.forEach((row, idx) => {
//                 if (idx === 0) return;

//                 frappe.model.set_value(
//                     row.doctype,
//                     row.name,
//                     'custom_per_kg_cost_',
//                     first_row_rate
//                 );

//                 calculate_row_values(frm, row.doctype, row.name);
//             });
//         }

//         calculate_totals(frm);
//         calculate_all(frm);

//         let row = locals[cdt][cdn];
//         if (row.item_code) {
//             frappe.call({
//                 method: "frappe.client.get_list",
//                 args: {
//                     doctype: "Batch",
//                     filters: { item: row.item_code },
//                     fields: ["name", "creation"],
//                     order_by: "creation desc",
//                     limit_page_length: 1
//                 },
//                 callback: function(r) {
//                     if (r.message && r.message.length > 0) {
//                         frappe.model.set_value(cdt, cdn, "custom_sfg_batch", r.message[0].name);
//                     } else {
//                         frappe.model.set_value(cdt, cdn, "custom_sfg_batch", "");
//                     }
//                 }
//             });
//         }
//     },

//     batch_no(frm, cdt, cdn) {
//         set_sfg_batch_to_fg(frm);
//     },

//     basic_rate(frm, cdt, cdn) {
//         calculate_pm_cost(frm);
//     },

//     custom_packaging_item(frm) {
//         calculate_pm_cost(frm);
//     },

//     qty(frm, cdt, cdn) {
//         calculate_row_values(frm, cdt, cdn);
//         calculate_totals(frm);
//         calculate_all(frm);
//     },

//     custom_packet_size(frm, cdt, cdn) {
//         calculate_row_values(frm, cdt, cdn);
//         calculate_totals(frm);
//     },

//     custom_per_kg_cost_(frm, cdt, cdn) {
//         calculate_row_values(frm, cdt, cdn);
//         calculate_totals(frm);
//     },

//     custom_per_unit_pm_cost(frm, cdt, cdn) {
//         calculate_row_values(frm, cdt, cdn);
//         calculate_totals(frm);
//     },

//     custom_is_packaging_material(frm, cdt, cdn) {
//         calculate_row_values(frm, cdt, cdn);
//         calculate_totals(frm);
//     },

//     custom_total_kg_consumed(frm) {
//         calculate_totals(frm);
//     },

//     custom_final_rate_after_loss(frm, cdt, cdn) {
//         let row = locals[cdt][cdn];

//         // 🔒 LOCK
//         if (row.custom_is_packaging_material) return;

//         let final_rate = flt(row.custom_final_rate_after_loss);
//         if (final_rate > 0) {
//             frappe.model.set_value(cdt, cdn, 'basic_rate', final_rate);
//         }
//     },

//     custom__is_fg_item(frm, cdt, cdn) {
//         calculate_all(frm);
//     },

//     custom_total_per_packet_fg_cost(frm, cdt, cdn) {
//         calculate_distribution(frm);
//     },

//     custom_per_packet_fg_cost(frm, cdt, cdn) {
//         calculate_distribution(frm);
//     },

//     custom_process_loss(frm, cdt, cdn) {
//         toggle_process_loss_fields(frm, cdt, cdn);
//     },

//     form_render(frm, cdt, cdn) {
//         toggle_process_loss_fields(frm, cdt, cdn);
//     },

//     items_add(frm, cdt, cdn) {
//         calculate_pm_cost(frm);
//         calculate_totals(frm);

//         if (frm.doc.custom_is_packaging_loss) {
//             frappe.model.set_value(cdt, cdn, 'custom_process_loss', 1);
//         }
//         toggle_process_loss_fields(frm, cdt, cdn);
//     },

//     items_remove(frm) {
//         calculate_totals(frm);
//         calculate_all(frm);
//     }

// });


// // =======================
// // SFG BATCH TO FG
// // =======================
// function set_sfg_batch_to_fg(frm) {
//     // 🔹 Find SFG item (only one needed)
//     let sfg_item = frm.doc.items.find(row =>
//         row.custom_is_sfg_item == 1 && row.batch_no
//     );
//     if (!sfg_item) return;
//     // 🔹 Find ALL FG items (multiple rows)
//     let fg_items = frm.doc.items.filter(row =>
//         row.custom__is_fg_item == 1
//     );
//     if (!fg_items.length) return;
//     // 🔹 Loop through all FG rows and set batch
//     fg_items.forEach(row => {
//         frappe.model.set_value(
//             row.doctype,
//             row.name,
//             'custom_sfg_batch',
//             sfg_item.batch_no
//         );
//     });
// }


// // =======================
// // PM COST
// // =======================
// function calculate_pm_cost(frm) {
//     let items = frm.doc.items || [];
//     let pm_map = {};

//     items.forEach(row => {
//         if (row.custom_is_packaging_material && row.item_code) {
//             pm_map[row.item_code] = flt(row.basic_rate);
//         }
//     });

//     items.forEach(row => {
//         if (row.custom_packaging_item && pm_map[row.custom_packaging_item] != null) {
//             let new_val = flt(pm_map[row.custom_packaging_item]);

//             if (row.custom_per_unit_pm_cost !== new_val) {
//                 frappe.model.set_value(row.doctype, row.name, 'custom_per_unit_pm_cost', new_val);
//                 calculate_row_values(frm, row.doctype, row.name);
//             }
//         }
//     });
// }


// // =======================
// // ROW CALC
// // =======================
// function calculate_row_values(frm, cdt, cdn) {
//     let row = locals[cdt][cdn];

//     let qty = flt(row.qty);
//     let packet_size = flt(row.custom_packet_size);
//     let per_kg = flt(row.custom_per_kg_cost_);
//     let per_unit_pm = flt(row.custom_per_unit_pm_cost);

//     let total_kg = qty * packet_size;
//     frappe.model.set_value(cdt, cdn, 'custom_total_kg_consumed', total_kg);

//     let per_packet_cost = packet_size * per_kg;
//     frappe.model.set_value(cdt, cdn, 'custom_per_packet_fg_cost', per_packet_cost);

//     // 🔒 LOCK
//     if (row.custom_is_packaging_material) return;

//     let items = frm.doc.items || [];
//     let is_source_row = items.length > 0 && row.name === items[0].name;

//     if (!is_source_row) {
//         let total_per_packet = per_packet_cost + per_unit_pm;
//         frappe.model.set_value(cdt, cdn, 'custom_total_per_packet_fg_cost', total_per_packet);

//         let final_rate = flt(row.custom_final_rate_after_loss);
//         frappe.model.set_value(cdt, cdn, 'basic_rate',
//             final_rate > 0 ? final_rate : total_per_packet
//         );
//     }
// }


// // =======================
// // TOTALS
// // =======================
// function calculate_totals(frm) {
//     let fg_total = 0;
//     let sfg_total = 0;
//     let per_kg_cost = 0;

//     (frm.doc.items || []).forEach(row => {
//         if (row.custom__is_fg_item) {
//             fg_total += flt(row.custom_total_kg_consumed);
//             per_kg_cost = flt(row.custom_per_kg_cost_);
//         }
//         if (row.custom_is_sfg_item) {
//             sfg_total += flt(row.qty);
//         }
//     });

//     frm.set_value('custom_total_incoming_kg_fg', fg_total);
//     frm.set_value('custom_total_outgoing_kg_sfg__', sfg_total);

//     let process_loss = sfg_total - fg_total;
//     frm.set_value('custom_process_loss_quantity', process_loss);

//     let loss_amount = process_loss * per_kg_cost;
//     frm.set_value('custom_packaging_loss_amount', loss_amount);

//     frm.set_value('custom_is_packaging_loss', process_loss > 0 ? 1 : 0);
// }


// // =======================
// // MAIN
// // =======================
// function calculate_all(frm) {
//     calculate_fg_total(frm);
//     calculate_process_loss(frm);
//     calculate_distribution(frm);
// }


// // =======================
// function calculate_fg_total(frm) {
//     let total = 0;
//     (frm.doc.items || []).forEach(row => {
//         if (row.custom__is_fg_item) {
//             total += flt(row.qty);
//         }
//     });
//     frm.set_value('custom_total_packets_produced', flt(total, 4));
// }


// // =======================
// function calculate_process_loss(frm) {
//     let loss_qty = flt(frm.doc.custom_process_loss_quantity);
//     let total_outgoing = flt(frm.doc.custom_total_outgoing_kg_sfg__);
//     let result = total_outgoing > 0 ? (loss_qty / total_outgoing) * 100 : 0;
//     frm.set_value('custom_packaging_process_loss_', flt(result, 2));
// }


// // =======================
// function calculate_distribution(frm) {

//     let total_packets = flt(frm.doc.custom_total_packets_produced);
//     let total_loss = flt(frm.doc.custom_packaging_loss_amount);

//     (frm.doc.items || []).forEach(row => {

//         // 🔒 LOCK
//         if (row.custom_is_packaging_material) return;

//         if (!row.custom__is_fg_item) {
//             frappe.model.set_value(row.doctype, row.name, {
//                 custom_distributed_process_loss: 0,
//                 custom_distributed_rate: 0,
//                 custom_final_rate_after_loss: 0
//             });
//             return;
//         }

//         let distribution = total_packets > 0 ? flt(row.qty) / total_packets : 0;

//         let distributed_rate = distribution * total_loss;

//         let total_per_packet = flt(row.custom_total_per_packet_fg_cost);
//         let qty = flt(row.qty);

//         let final_rate = qty > 0
//             ? total_per_packet + (distributed_rate / qty)
//             : total_per_packet;

//         frappe.model.set_value(row.doctype, row.name, {
//             custom_distributed_process_loss: distribution,
//             custom_distributed_rate: distributed_rate,
//             custom_final_rate_after_loss: flt(final_rate, 8)
//         });
//     });
// }


// // =======================
// function toggle_process_loss_fields(frm, cdt, cdn) {
//     var row = locals[cdt][cdn];

//     if (row.custom_is_packaging_material) return;

//     var show = row.custom_process_loss ? true : false;

//     ['custom_distributed_process_loss','custom_distributed_rate','custom_final_rate_after_loss']
//     .forEach(field => {
//         frm.fields_dict['items'].grid.toggle_display(field, show);
//     });

//     frm.refresh_field('items');
// }


// // =======================
// function refresh_all_rows(frm) {
//     (frm.doc.items || []).forEach(row => {
//         toggle_process_loss_fields(frm, row.doctype, row.name);
//     });
// }
