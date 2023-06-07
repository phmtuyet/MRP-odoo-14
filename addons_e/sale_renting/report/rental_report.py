# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import fields, models, tools


class RentalReport(models.Model):
    _name = "sale.rental.report"
    _description = "Rental Analysis Report"
    _auto = False

    date = fields.Date('Date', readonly=True)
    order_id = fields.Many2one('sale.order', 'Order #', readonly=True)
    product_id = fields.Many2one('product.product', 'Product', readonly=True)
    product_uom = fields.Many2one('uom.uom', 'Unit of Measure', readonly=True)
    quantity = fields.Float('Daily Ordered Qty', readonly=True)
    qty_delivered = fields.Float('Daily Picked-Up Qty', readonly=True)
    qty_returned = fields.Float('Daily Returned Qty', readonly=True)
    partner_id = fields.Many2one('res.partner', 'Customer', readonly=True)
    user_id = fields.Many2one('res.users', 'Salesman', readonly=True)
    company_id = fields.Many2one('res.company', 'Company', readonly=True)
    product_tmpl_id = fields.Many2one('product.template', 'Product Template', readonly=True)
    categ_id = fields.Many2one('product.category', 'Product Category', readonly=True)
    state = fields.Selection([
        ('draft', 'Draft Quotation'),
        ('sent', 'Quotation Sent'),
        ('sale', 'Sales Order'),
        ('done', 'Sales Done'),
        ('cancel', 'Cancelled'),
    ], string='Status', readonly=True)
    price = fields.Float('Daily Amount', readonly=True)
    currency_id = fields.Many2one('res.currency', 'Currency', readonly=True)


    def _quantity(self):
        return """
            product_uom_qty / (u.factor * u2.factor) AS quantity,
            qty_delivered / (u.factor * u2.factor) AS qty_delivered,
            qty_returned / (u.factor * u2.factor) AS qty_returned
        """

    def _price(self):
        return """
            price_subtotal / (date_part('day',return_date - pickup_date) + 1)
        """

    def _select(self):
        return """
            sol.id,
            order_id,
            product_id,
            %s,
            product_uom,
            order_partner_id AS partner_id,
            salesman_id AS user_id,
            categ_id,
            product_tmpl_id,
            generate_series(pickup_date::date, return_date::date, '1 day'::interval)::date date,
            %s AS price,
            sol.company_id,
            sol.state,
            sol.currency_id
        """% (self._quantity(), self._price())

    def _from(self):
        return """
            sale_order_line AS sol
            join product_product AS p on p.id=sol.product_id
            join product_template AS pt on p.product_tmpl_id=pt.id
            join uom_uom AS u on u.id=sol.product_uom
            join uom_uom AS u2 on u2.id=pt.uom_id
        """

    def _query(self):
        return """
            (SELECT %s
            FROM %s
            WHERE is_rental)
        """ % (
            self._select(),
            self._from()
        )

    def init(self):
        # self._table = sale_rental_report
        tools.drop_view_if_exists(self.env.cr, self._table)
        self.env.cr.execute("""CREATE or REPLACE VIEW %s as (%s)""" % (self._table, self._query()))
