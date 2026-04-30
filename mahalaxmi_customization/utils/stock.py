import frappe
from frappe.utils import flt
from erpnext.stock.doctype.stock_entry.stock_entry import StockEntry
from erpnext.controllers.taxes_and_totals import init_landed_taxes_and_totals
import frappe

class CustomStockEntry(StockEntry):

    def calculate_rate_and_amount(self, reset_outgoing_rate=True, raise_error_if_no_rate=True):

        

        #  Keep remaining logic
        init_landed_taxes_and_totals(self)
        self.distribute_additional_costs()
        self.update_valuation_rate()
        self.set_total_incoming_outgoing_value()
        self.set_total_amount()


import re
from datetime import datetime
import frappe

def after_save(doc, method):
    calculate_pm_cost(doc)
    calculate_row_values_all(doc)
    calculate_totals(doc)
    set_sfg_batch(doc)

    # 🔥 Important: Save updated values again
    doc.db_update()


# =======================
# PM COST LOGIC
# =======================
def calculate_pm_cost(doc):
    pm_map = {}

    for row in doc.items:
        if row.custom_is_packaging_material and row.item_code:
            pm_map[row.item_code] = row.basic_rate or 0

    for row in doc.items:
        if row.custom_packaging_item and row.custom_packaging_item in pm_map:
            new_val = pm_map[row.custom_packaging_item]

            if row.custom_per_unit_pm_cost != new_val:
                row.custom_per_unit_pm_cost = new_val


# =======================
# ROW CALCULATIONS
# =======================
def calculate_row_values_all(doc):

    if not doc.items:
        return

    first_row_name = doc.items[0].name

    for row in doc.items:

        qty = row.qty or 0
        packet_size = row.custom_packet_size or 0
        per_kg = row.custom_per_kg_cost_ or 0
        per_unit_pm = row.custom_per_unit_pm_cost or 0

        # Total KG
        row.custom_total_kg_consumed = qty * packet_size

        # Per packet FG cost
        per_packet_cost = packet_size * per_kg
        row.custom_per_packet_fg_cost = per_packet_cost

        is_source_row = row.name == first_row_name

        if not is_source_row:

            if per_unit_pm > 0:
                total_per_packet = per_packet_cost + per_unit_pm
                row.custom_total_per_packet_fg_cost = total_per_packet

                final_rate = row.custom_final_rate_after_loss or 0
                row.basic_rate = final_rate if final_rate > 0 else total_per_packet

            else:
                row.custom_total_per_packet_fg_cost = 0

                if per_packet_cost > 0:
                    final_rate = row.custom_final_rate_after_loss or 0
                    row.basic_rate = final_rate if final_rate > 0 else per_packet_cost


# =======================
# TOTAL CALCULATIONS
# =======================
def calculate_totals(doc):

    fg_total = 0
    sfg_total = 0
    per_kg_cost = 0

    for row in doc.items:

        if row.custom__is_fg_item:
            fg_total += row.custom_total_kg_consumed or 0
            per_kg_cost = row.custom_per_kg_cost_ or 0

        if row.custom_is_sfg_item:
            sfg_total += row.qty or 0

    doc.custom_total_incoming_kg_fg = fg_total
    doc.custom_total_outgoing_kg_sfg__ = sfg_total

    process_loss = sfg_total - fg_total
    doc.custom_process_loss_quantity = process_loss

    loss_amount = process_loss * per_kg_cost
    doc.custom_packaging_loss_amount = loss_amount

    doc.custom_is_packaging_loss = 1 if process_loss > 0 else 0


# =======================
# BATCH AUTO SET
# =======================
def set_sfg_batch(doc):

    for row in doc.items:

        if row.custom_packaging_item and row.item_code:

            match = re.search(r'(\d{4})$', row.item_code)
            last_digits = match.group(1) if match else ""

            if last_digits:
                today = datetime.today()

                month = str(today.month).zfill(2)
                year = str(today.year)[-2:]

                batch_name = f"RM/{month}/{year}/{last_digits}"

                row.custom_sfg_batch = batch_name