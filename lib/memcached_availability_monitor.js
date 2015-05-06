/**
 * This script was developed by Guberni and is part of Tellki's Monitoring Solution
 *
 * March, 2015
 * 
 * Version 1.0
 * 
 * DESCRIPTION: Monitor Memcache Availability
 *
 * SYNTAX: node memcached_availability_monitor.js <METRIC_STATE> <HOST> <PORT>
 * 
 * EXAMPLE: node memcached_availability_monitor.js "1,1,1" "10.10.2.5" "11211"
 *
 * README:
 *		<METRIC_STATE> is generated internally by Tellki and it's only used by Tellki default monitors: 1 - metric is on; 0 - metric is off
 *		<HOST> memcached ip address or hostname
 *		<PORT> memcached port
 */

var net = require('net');
 
/**
 * Metrics.
 */
var metrics = [];
metrics['Status'] = { id: '1531:Status:9' };
metrics['ResponseTime'] = { id: '1532:Response Time:4' };
metrics['Uptime'] = { id: '1533:Uptime:4', key : 'uptime' };
 
var inputLength = 3;
 
/**
 * Entry point.
 */
(function() {
	try
	{
		monitorInput(process.argv);
	}
	catch(err)
	{	
		if(err instanceof InvalidParametersNumberError)
		{
			console.log(err.message);
			process.exit(err.code);
		}
		else if(err instanceof UnknownHostError)
		{
			console.log(err.message);
			process.exit(err.code);
		}
		else
		{
			console.log(err.message);
			process.exit(1);
		}
	}
}).call(this);

// ############################################################################
// PARSE INPUT

/**
 * Verify number of passed arguments into the script, process the passed arguments and send them to monitor execution.
 * Receive: arguments to be processed
 */
function monitorInput(args)
{
	args = args.slice(2);
	if(args.length != inputLength)
		throw new InvalidParametersNumberError();
	
	//<METRIC_STATE>
	var metricState = args[0].replace('"', '');
	var tokens = metricState.split(',');
	var metricsExecution = new Array();
	for(var i in tokens)
		metricsExecution[i] = (tokens[i] === '1');
	
	//<HOST> 
	var hostname = args[1];
	
	//<PORT> 
	var port = args[2];
	if (port.length === 0)
		port = '11211';

	// Create request object to be executed.
	var request = new Object()
	request.checkMetrics = metricsExecution;
	request.hostname = hostname;
	request.port = port;
	
	// Get metrics.
	processRequest(request);
}

// ############################################################################
// GET METRICS

/**
 * Retrieve metrics information
 * Receive: object request containing configuration
 */
function processRequest(request) 
{
	var keys = {};
	var metricsObj = [];
	var socket = net.Socket();
	var ts = new Date();
	
	socket.connect(request.port, request.hostname);
	socket.write('stats\n');

	socket.on('data', function(data) {
		
		ts = (new Date()) - ts;
		
		// Status
		if (request.checkMetrics[0])
		{
			var metric = new Object();
			metric.id = metrics['Status'].id;
			metric.val = '1';
			metricsObj.push(metric);
		}

		// Response time
		if (request.checkMetrics[1])
		{
			var metric = new Object();
			metric.id = metrics['ResponseTime'].id;
			metric.val = ts;
			metricsObj.push(metric);
		}
		
		// Parse data
		var lines = data.toString().split('\n');
		for (var i in lines)
		{
			var tokens = lines[i].trim().split(' ');
			if (tokens.length === 3)
				keys[tokens[1]] = tokens[2];
		}

		// Uptime
		if (request.checkMetrics[2])
		{
			var uptimeValue = keys[metrics['Uptime'].key];
			if (uptimeValue === undefined)
				errorHandler(new MetricNotFoundError());
			
			var metric = new Object();
			metric.id = metrics['Uptime'].id;
			metric.val = uptimeValue;
			metricsObj.push(metric);
		}
		
		// Output
		output(metricsObj);
		process.exit(0);
	});
	
	socket.on('error', function(data) {
		
		// Status
		if (request.checkMetrics[0])
		{
			var metric = new Object();
			metric.id = metrics['Status'].id;
			metric.val = '0';
			metricsObj.push(metric);
		}
		
		// Output
		output(metricsObj);
		process.exit(0);
	});
	
	socket.end();
}

// ############################################################################
// OUTPUT METRICS

/**
 * Send metrics to console
 * Receive: metrics list to output
 */
function output(metrics)
{
	for (var i in metrics)
	{
		var out = '';
		var metric = metrics[i];
		
		out += metric.id;
		out += '|';
		out += metric.val;
		out += '|';
		
		console.log(out);
	}
}

// ############################################################################
// ERROR HANDLER

/**
 * Used to handle errors of async functions
 * Receive: Error/Exception
 */
function errorHandler(err)
{
	if(err instanceof UnknownHostError)
	{
		console.log(err.message);
		process.exit(err.code);
	}
	else if (err instanceof MetricNotFoundError)
	{
		console.log(err.message);
		process.exit(err.code);		
	}
	else
	{
		console.log(err.message);
		process.exit(1);
	}
}

// ############################################################################
// EXCEPTIONS

/**
 * Exceptions used in this script.
 */
function InvalidParametersNumberError() {
    this.name = 'InvalidParametersNumberError';
    this.message = 'Wrong number of parameters.';
	this.code = 3;
}
InvalidParametersNumberError.prototype = Object.create(Error.prototype);
InvalidParametersNumberError.prototype.constructor = InvalidParametersNumberError;

function UnknownHostError() {
    this.name = 'UnknownHostError';
    this.message = 'Unknown host.';
	this.code = 28;
}
UnknownHostError.prototype = Object.create(Error.prototype);
UnknownHostError.prototype.constructor = UnknownHostError;

function MetricNotFoundError() {
    this.name = 'MetricNotFoundError';
    this.message = '';
	this.code = 8;
}
MetricNotFoundError.prototype = Object.create(Error.prototype);
MetricNotFoundError.prototype.constructor = MetricNotFoundError;
