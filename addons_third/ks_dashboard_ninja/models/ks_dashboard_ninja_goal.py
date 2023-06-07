# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError
import datetime
import json
from ..lib.ks_date_filter_selections import ks_get_date


class KsDashboardItemsGoal(models.Model):
    _name = 'ks_dashboard_ninja.item_goal'
    _description = 'Dashboard Ninja Items Goal Lines'

    ks_goal_date = fields.Date(string="Date")
    ks_goal_value = fields.Float(string="Value")
    ks_dashboard_item = fields.Many2one('ks_dashboard_ninja.item', string="Dashboard Item")
