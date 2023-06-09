# -*- coding: utf-8 -*-
from odoo import api, fields, models, _


class MrpProduction(models.Model):
    _inherit = 'mrp.production'

    # region Override
    def button_plan(self):
        """ Create work orders. And probably do stuff, like things. """
        orders_to_plan = self.filtered(lambda order: not order.is_planned)
        orders_to_plan = orders_to_plan._sort_mrp_production()

        for order in orders_to_plan:
            (order.move_raw_ids | order.move_finished_ids).filtered(lambda m: m.state == 'draft')._action_confirm()
            order._plan_workorders()
        return True

    # end region Override

    # region new function
    def _sort_mrp_production(self):
        available_ingredient_mo = self.filtered(lambda order: order.components_availability_state == 'available')
        expected_ingredient_mo = self.filtered(lambda order: order.components_availability_state == 'expected')
        late_ingredient_mo = self.filtered(lambda order: order.components_availability_state == 'late')

        list_mo = available_ingredient_mo._sort_mrp_by_qty_ingredient()
        list_mo |= expected_ingredient_mo._sort_mrp_by_qty_ingredient(list_mo[-1] if list_mo else False)
        list_mo |= late_ingredient_mo._sort_mrp_by_qty_ingredient(list_mo[-1] if list_mo else False)

        return list_mo

    def _sort_mrp_by_qty_ingredient(self, last_mo_available=False):
        if len(self) <= 1:
            return self
        self.sorted(lambda order: (order.name[0], order.date_planned_start))
        after_sort_mo = self.env['mrp.production']
        last_mo = self.env['mrp.production'] if not last_mo_available else last_mo_available
        i = 0
        while i < len(self):
            tmp_mo = self.filtered(lambda order: order.name[0] == self[i].name[0])
            i = i + len(tmp_mo)
            if len(tmp_mo) == 1:
                after_sort_mo |= tmp_mo
                last_mo = tmp_mo
            else:
                if not after_sort_mo:
                    last_mo = tmp_mo.sorted(lambda order: sum(wo.duration_expected for wo in order.workorder_ids), reverse=True)[0]
                    after_sort_mo |= last_mo
                    tmp_mo = tmp_mo - last_mo
                while len(tmp_mo):
                    last_mo = tmp_mo._get_same_ingredient_mo(last_mo)
                    after_sort_mo |= last_mo
                    tmp_mo = tmp_mo - last_mo
        return after_sort_mo

    def _get_same_ingredient_mo(self, last_mo):
        if len(self) <= 1:
            return self
        return self.sorted(
            lambda order: (len(last_mo.move_raw_ids.mapped('product_id') & order.move_raw_ids.mapped('product_id')),
                           sum(wo.duration_expected for wo in order.workorder_ids)),
            reverse=True)[0]

    # end region
