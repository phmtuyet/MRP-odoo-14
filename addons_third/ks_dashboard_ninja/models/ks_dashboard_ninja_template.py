# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError
import datetime
import json
from ..lib.ks_date_filter_selections import ks_get_date

class KsDashboardNinjaTemplate(models.Model):
    _name = 'ks_dashboard_ninja.board_template'
    _description = 'Dashboard Ninja Template'
    name = fields.Char()
    ks_gridstack_config = fields.Char()
    ks_item_count = fields.Integer()
