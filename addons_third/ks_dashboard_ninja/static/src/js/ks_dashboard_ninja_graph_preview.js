odoo.define('ks_dashboard_ninja_list.ks_dashboard_graph_preview', function (require) {
    "use strict";

    var registry = require('web.field_registry');
    var AbstractField = require('web.AbstractField');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var field_utils = require('web.field_utils');
    var session = require('web.session');
    var utils = require('web.utils');
    var config = require('web.config');
    var field_utils = require('web.field_utils');

    var QWeb = core.qweb;

    var MAX_LEGEND_LENGTH = 25 * (Math.max(1, config.device.size_class));

    var KsGraphPreview = AbstractField.extend({
        supportedFieldTypes: ['char'],

        resetOnAnyFieldChange: true,

        init: function (parent, state, params) {
            this._super.apply(this, arguments);

            this.jsLibs = ['/ks_dashboard_ninja/static/lib/js/Chart.js',
                '/ks_dashboard_ninja/static/lib/js/Chart.min.js',
                '/ks_dashboard_ninja/static/lib/js/Chart.bundle.min.js',
                '/ks_dashboard_ninja/static/lib/js/Chart.bundle.js'
            ];
            this.cssLibs = ['/ks_dashboard_ninja/static/lib/css/Chart.css',
                '/ks_dashboard_ninja/static/lib/css/Chart.min.css'
            ];
        },

        start: function () {
            var self = this;
            self.ks_set_default_chart_view();
            core.bus.on("DOM_updated", this, function () {
                if(self.shouldRenderChart && $.find('#ksMyChart').length>0) self.renderChart();
            });
            return this._super();
        },

        ks_set_default_chart_view: function () {
            Chart.plugins.register({
                afterDraw: function (chart) {
                    if (chart.data.labels.length === 0) {
                        // No data is present
                        var ctx = chart.chart.ctx;
                        var width = chart.chart.width;
                        var height = chart.chart.height
                        chart.clear();

                        ctx.save();
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.font = "3rem 'Lucida Grande'";
                        ctx.fillText('No data available', width / 2, height / 2);
                        ctx.restore();
                    }
                }
            });
        },

        _render: function () {
            this.$el.empty()
            if (this.recordData.ks_dashboard_item_type !== 'ks_tile' && this.recordData.ks_dashboard_item_type !== 'ks_kpi' && this.recordData.ks_dashboard_item_type !== 'ks_list_view') {
                if(this.recordData.ks_model_id){
                    if (this.recordData.ks_chart_groupby_type == 'date_type' && !this.recordData.ks_chart_date_groupby) {
                        return this.$el.append($('<div>').text("Select Group by date to create chart based on date groupby"));
                    }else if(this.recordData.ks_chart_data_count_type==="count" && !this.recordData.ks_chart_relation_groupby){
                        this.$el.append($('<div>').text("Select Group By to create chart view"));
                    }else if(this.recordData.ks_chart_data_count_type!=="count" && (this.recordData.ks_chart_measure_field.count === 0 || !this.recordData.ks_chart_relation_groupby)){
                        this.$el.append($('<div>').text("Select Measure and Group By to create chart view"));
                    }else if(!this.recordData.ks_chart_data_count_type){
                        this.$el.append($('<div>').text("Select Chart Data Count Type"));
                    }else{
                        this._getChartData();
                    }
                }else{
                    this.$el.append($('<div>').text("Select a Model first."));
                }

            }

        },

        _getChartData: function () {
            var self = this;
            self.shouldRenderChart = true;
            var field = this.recordData;
            var ks_chart_name;
            if (field.name) ks_chart_name = field.name;
            else if (field.ks_model_name) ks_chart_name = field.ks_model_id.data.display_name;
            else ks_chart_name = "Name";

            this.chart_type = this.recordData.ks_dashboard_item_type.split('_')[1];
            this.chart_data = JSON.parse(this.recordData.ks_chart_data);

            var $chartContainer = $(QWeb.render('ks_chart_form_view_container', {
                ks_chart_name: ks_chart_name
            }));
            this.$el.append($chartContainer);

            switch (this.chart_type) {
                case "pie":
                case "doughnut":
                case "polarArea":
                    this.chart_family = "circle";
                    break;
                case "bar":
                case "horizontalBar":
                case "line":
                case "area":
                    this.chart_family = "square"
                    break;
                default:
                    this.chart_family = "none";
                    break;
            }

            if(this.chart_family === "circle"){
                if (this.chart_data && this.chart_data['labels'].length > 30){
                    this.$el.find(".card-body").empty().append($("<div style='font-size:20px;'>Too many records for selected Chart Type. Consider using <strong>Domain</strong> to filter records or <strong>Record Limit</strong> to limit the no of records under <strong>30.</strong>"));
                    return ;
                }
            }
            if($.find('#ksMyChart').length>0){
                this.renderChart();
            }
        },

        renderChart: function(){
            var self = this;
            if(this.recordData.ks_chart_measure_field_2.count && this.recordData.ks_dashboard_item_type === 'ks_bar_chart'){
                var scales  = {}
                scales.yAxes = [
                    {
                        type: "linear",
                        display: true,
                        position: "left",
                        id: "y-axis-0",
                        gridLines:{
                            display: false
                        },
                        labels: {
                            show:true,
                        }
                    },
                    {
                        type: "linear",
                        display: true,
                        position: "right",
                        id: "y-axis-1",
                        labels: {
                            show:true,
                        },
                        ticks: {
                            beginAtZero: true,
                            callback : function(value, index, values){
                                return field_utils.format.float(value,Float64Array);
                            },
                        }
                    }
                ]

            }
            this.ksMyChart = new Chart($.find('#ksMyChart')[0], {
                    type: this.chart_type === "area" ? "line" : this.chart_type,
                    data: {
                        labels: this.chart_data['labels'],
                        datasets: this.chart_data.datasets,
                    },
                    options: {
                        maintainAspectRatio: false,
                        animation: {
                            easing: 'easeInQuad',
                        },
                        scales:scales,
                    }
                });
            if(this.chart_data && this.chart_data["datasets"].length>0){
               self.ksChartColors(this.recordData.ks_chart_item_color, this.ksMyChart, this.chart_type, this.chart_family);
            }
        },

        ksChartColors: function (palette, ksMyChart, ksChartType, ksChartFamily) {
            var currentPalette = "cool";
            if (!palette) palette = currentPalette;
            currentPalette = palette;

            /*Gradients
              The keys are percentage and the values are the color in a rgba format.
              You can have as many "color stops" (%) as you like.
              0% and 100% is not optional.*/
            var gradient;
            switch (palette) {
                case 'cool':
                    gradient = {
                        0: [255, 255, 255, 1],
                        20: [220, 237, 200, 1],
                        45: [66, 179, 213, 1],
                        65: [26, 39, 62, 1],
                        100: [0, 0, 0, 1]
                    };
                    break;
                case 'warm':
                    gradient = {
                        0: [255, 255, 255, 1],
                        20: [254, 235, 101, 1],
                        45: [228, 82, 27, 1],
                        65: [77, 52, 47, 1],
                        100: [0, 0, 0, 1]
                    };
                    break;
                case 'neon':
                    gradient = {
                        0: [255, 255, 255, 1],
                        20: [255, 236, 179, 1],
                        45: [232, 82, 133, 1],
                        65: [106, 27, 154, 1],
                        100: [0, 0, 0, 1]
                    };
                    break;

                case 'default':
                    var color_set = ['#F04F65', '#f69032', '#fdc233', '#53cfce', '#36a2ec', '#8a79fd', '#b1b5be', '#1c425c', '#8c2620', '#71ecef', '#0b4295', '#f2e6ce', '#1379e7']
            }



            //Find datasets and length
            var chartType = ksMyChart.config.type;

            switch (chartType) {
                case "pie":
                case "doughnut":
                case "polarArea":
                    var datasets = ksMyChart.config.data.datasets[0];
                    var setsCount = datasets.data.length;
                    break;
                case "bar":
                case "horizontalBar":
                case "line":
                    var datasets = ksMyChart.config.data.datasets;
                    var setsCount = datasets.length;
                    break;
            }

            //Calculate colors
            var chartColors = [];

            if (palette !== "default") {
                //Get a sorted array of the gradient keys
                var gradientKeys = Object.keys(gradient);
                gradientKeys.sort(function (a, b) {
                    return +a - +b;
                });
                for (var i = 0; i < setsCount; i++) {
                    var gradientIndex = (i + 1) * (100 / (setsCount + 1)); //Find where to get a color from the gradient
                    for (var j = 0; j < gradientKeys.length; j++) {
                        var gradientKey = gradientKeys[j];
                        if (gradientIndex === +gradientKey) { //Exact match with a gradient key - just get that color
                            chartColors[i] = 'rgba(' + gradient[gradientKey].toString() + ')';
                            break;
                        } else if (gradientIndex < +gradientKey) { //It's somewhere between this gradient key and the previous
                            var prevKey = gradientKeys[j - 1];
                            var gradientPartIndex = (gradientIndex - prevKey) / (gradientKey - prevKey); //Calculate where
                            var color = [];
                            for (var k = 0; k < 4; k++) { //Loop through Red, Green, Blue and Alpha and calculate the correct color and opacity
                                color[k] = gradient[prevKey][k] - ((gradient[prevKey][k] - gradient[gradientKey][k]) * gradientPartIndex);
                                if (k < 3) color[k] = Math.round(color[k]);
                            }
                            chartColors[i] = 'rgba(' + color.toString() + ')';
                            break;
                        }
                    }
                }
            } else {
                for (var i = 0, counter = 0; i < setsCount; i++, counter++) {
                    if (counter >= color_set.length) counter = 0; // reset back to the beginning

                    chartColors.push(color_set[counter]);
                }

            }

            var datasets = ksMyChart.config.data.datasets;
            var options = ksMyChart.config.options;

            options.legend.labels.usePointStyle = true;
            if (ksChartFamily == "circle") {
                options.legend.position = 'bottom';
                options.tooltips.callbacks = {
                                               title: function(tooltipItem, data) {
                                                    var k_amount = data.datasets[tooltipItem[0].datasetIndex]['data'][tooltipItem[0].index];
                                                    k_amount = field_utils.format.float(k_amount,Float64Array);
                                                    return data.datasets[tooltipItem[0].datasetIndex]['label']+" : " + k_amount;
                                               },
                                               label : function(tooltipItem, data) {
                                                          return data.labels[tooltipItem.index];
                                                        },

                                             }
                for (var i = 0; i < datasets.length; i++) {
                    datasets[i].backgroundColor = chartColors;
                    datasets[i].borderColor = "rgba(255,255,255,1)";
                }
                if(this.recordData.ks_semi_circle_chart && (chartType === "pie" || chartType ==="doughnut") ){
                    options.rotation = 1*Math.PI;
                    options.circumference = 1*Math.PI;
                }
            } else if (ksChartFamily == "square") {
                options.scales.xAxes[0].gridLines.display = false;
                options.scales.yAxes[0].ticks.beginAtZero = true;

                if(chartType === "horizontalBar"){
                    options.scales.xAxes[0].ticks.callback = function(value,index,values){
                        return field_utils.format.float(value,Float64Array)
                    }
                    options.scales.xAxes[0].ticks.beginAtZero = true;
                }
                else{
                    options.scales.yAxes[0].ticks.callback = function(value,index,values){
                        return field_utils.format.float(value,Float64Array)
                    }
                }
                options.tooltips.callbacks = {
                    label: function(tooltipItem, data) {
                        var k_amount = data.datasets[tooltipItem.datasetIndex]['data'][tooltipItem.index];
                        k_amount = field_utils.format.float(k_amount,Float64Array);
                        return data.datasets[tooltipItem.datasetIndex]['label']+" : " + k_amount;
                    }
                }

                for (var i = 0; i < datasets.length; i++) {
                    switch (ksChartType) {
                        case "bar":
                        case "horizontalBar":
                            if (datasets[i].type && datasets[i].type=="line"){
                                datasets[i].borderColor = chartColors[i];
                                datasets[i].backgroundColor = "rgba(255,255,255,0)";
                            }
                            else{
                                datasets[i].backgroundColor = chartColors[i];
                                datasets[i].borderColor = "rgba(255,255,255,0)";
                                options.scales.xAxes[0].stacked = this.recordData.ks_bar_chart_stacked;
                                options.scales.yAxes[0].stacked = this.recordData.ks_bar_chart_stacked;
                            }
                            break;
                        case "line":
                            datasets[i].borderColor = chartColors[i];
                            datasets[i].backgroundColor = "rgba(255,255,255,0)";
                            break;
                        case "area":
                            datasets[i].borderColor = chartColors[i];
                            break;
                    }
                }

            }
            ksMyChart.update();
            if(this.$el.find('canvas').height() < 250){
                this.$el.find('canvas').height(250);
            }
        },


    });
    registry.add('ks_dashboard_graph_preview', KsGraphPreview);

    return {
        KsGraphPreview: KsGraphPreview,
    };

});