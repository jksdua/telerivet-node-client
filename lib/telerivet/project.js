/**
    Project
    
    Represents a Telerivet project.
    
    Provides methods for sending and scheduling messages, as well as
    accessing, creating and updating a variety of entities, including contacts, messages,
    scheduled messages, groups, labels, phones, services, and data tables.
    
    Fields:
    
      - id (string, max 34 characters)
          * ID of the project
          * Read-only
      
      - name
          * Name of the project
          * Updatable via API
      
      - timezone_id
          * Default TZ database timezone ID; see
              <http://en.wikipedia.org/wiki/List_of_tz_database_time_zones>
          * Read-only
      
      - vars (associative array)
          * Custom variables stored for this project
          * Updatable via API
 */ 
 
var util = require('./util'),
    Entity = require('./entity');
 
var Project = util.makeClass('Project', Entity);

/**
    project.sendMessage(options, callback)
    
    Sends one message (SMS or USSD request).
    
    Arguments:
      - options (associative array)
          * Required
        
        - content
            * Content of the message to send
            * Required if sending SMS message
        
        - to_number (string)
            * Phone number to send the message to
            * Required if contact_id not set
        
        - contact_id
            * ID of the contact to send the message to
            * Required if to_number not set
        
        - route_id
            * ID of the phone or route to send the message from
            * Default: default sender phone ID for your project
        
        - status_url
            * Webhook callback URL to be notified when message status changes
        
        - status_secret
            * POST parameter 'secret' passed to status_url
        
        - is_template (bool)
            * Set to true to evaluate variables like [[contact.name]] in message content. [(See
                available variables)](#variables)
            * Default: false
        
        - label_ids (array)
            * List of IDs of labels to add to this message
        
        - message_type
            * Type of message to send
            * Allowed values: sms, ussd
            * Default: sms
        
        - vars (associative array)
            * Custom variables to store with the message
        
        - priority (int)
            * Priority of the message (currently only observed for Android phones). Telerivet
                will attempt to send messages with higher priority numbers first (for example, so
                you can prioritize an auto-reply ahead of a bulk message to a large group).
            * Default: 1
      
      - callback : function(err, message)
          * Required
    */
Project.prototype.sendMessage = function(options, callback)
{
    this.api.doRequest("POST", this.getBaseApiPath() + "/messages/send", options, this.api.wrapCallback(require('./message'), callback));
};

/**
    project.sendMessages(options, callback)
    
    Sends an SMS message (optionally with mail-merge templates) to a group or a list of up to
    500 phone numbers
    
    Arguments:
      - options (associative array)
          * Required
        
        - content
            * Content of the message to send
            * Required
        
        - group_id
            * ID of the group to send the message to
            * Required if to_numbers not set
        
        - to_numbers (array of strings)
            * List of up to 500 phone numbers to send the message to
            * Required if group_id not set
        
        - route_id
            * ID of the phone or route to send the message from
            * Default: default sender phone ID
        
        - status_url
            * Webhook callback URL to be notified when message status changes
        
        - label_ids (array)
            * Array of IDs of labels to add to all messages sent (maximum 5)
        
        - status_secret
            * POST parameter 'secret' passed to status_url
        
        - exclude_contact_id
            * Optionally excludes one contact from receiving the message (only when group_id is
                set)
        
        - is_template (bool)
            * Set to true to evaluate variables like [[contact.name]] in message content [(See
                available variables)](#variables)
            * Default: false
        
        - vars (associative array)
            * Custom variables to set for each message
      
      - callback : function(err, res)
          * Required
    */
Project.prototype.sendMessages = function(options, callback)
{
    this.api.doRequest("POST", this.getBaseApiPath() + "/messages/send_batch", options, callback);
};

/**
    project.scheduleMessage(options, callback)
    
    Schedules an SMS message to a group or single contact. Note that Telerivet only sends
    scheduled messages approximately once per minute, so it is not possible to control the exact
    second at which a scheduled message is sent.
    
    Arguments:
      - options (associative array)
          * Required
        
        - content
            * Content of the message to schedule
            * Required
        
        - group_id
            * ID of the group to send the message to
            * Required if to_number not set
        
        - to_number (string)
            * Phone number to send the message to
            * Required if group_id not set
        
        - start_time (UNIX timestamp)
            * The time that the message will be sent (or first sent for recurring messages)
            * Required if start_time_offset not set
        
        - start_time_offset (int)
            * Number of seconds from now until the message is sent
            * Required if start_time not set
        
        - rrule
            * A recurrence rule describing the how the schedule repeats, e.g. 'FREQ=MONTHLY' or
                'FREQ=WEEKLY;INTERVAL=2'; see <https://tools.ietf.org/html/rfc2445#section-4.3.10>.
                (UNTIL is ignored; use end_time parameter instead).
            * Default: COUNT=1 (one-time scheduled message, does not repeat)
        
        - route_id
            * ID of the phone or route to send the message from
            * Default: default sender phone ID
        
        - message_type
            * Type of message to send
            * Allowed values: sms, ussd
            * Default: sms
        
        - is_template (bool)
            * Set to true to evaluate variables like [[contact.name]] in message content
            * Default: false
        
        - label_ids (array)
            * Array of IDs of labels to add to the sent messages (maximum 5)
        
        - timezone_id
            * TZ database timezone ID; see
                <http://en.wikipedia.org/wiki/List_of_tz_database_time_zones>
            * Default: project default timezone
        
        - end_time (UNIX timestamp)
            * Time after which a recurring message will stop (not applicable to non-recurring
                scheduled messages)
        
        - end_time_offset (int)
            * Number of seconds from now until the recurring message will stop
      
      - callback : function(err, scheduled_msg)
          * Required
    */
Project.prototype.scheduleMessage = function(options, callback)
{
    this.api.doRequest("POST", this.getBaseApiPath() + "/scheduled", options, this.api.wrapCallback(require('./scheduledmessage'), callback));
};

/**
    project.getOrCreateContact(options, callback)
    
    Retrieves OR creates and possibly updates a contact by name or phone number.
    
    If a phone number is provided, Telerivet will search for an existing
    contact with that phone number (including suffix matches to allow finding contacts with
    phone numbers in a different format).
    
    If a phone number is not provided but a name is provided, Telerivet
    will search for a contact with that exact name (case insensitive).
    
    If no existing contact is found, a new contact will be created.
    
    Then that contact will be updated with any parameters provided
    (name, phone_number, and vars).
    
    Arguments:
      - options (associative array)
          * Required
        
        - name
            * Name of the contact
            * Required if phone_number not set
        
        - phone_number
            * Phone number of the contact
            * Required if name not set
        
        - vars (associative array)
            * Custom variables and values to update on the contact
      
      - callback : function(err, contact)
          * Required
    */
Project.prototype.getOrCreateContact = function(options, callback)
{
    this.api.doRequest("POST", this.getBaseApiPath() + "/contacts", options, this.api.wrapCallback(require('./contact'), callback));
};

/**
    project.queryContacts(options)
    
    Queries contacts within the given project.
    
    Arguments:
      - options (associative array)
        
        - name
            * Filter contacts by name
            * Allowed modifiers: name[ne], name[prefix], name[not_prefix], name[gte], name[gt],
                name[lt], name[lte]
        
        - phone_number
            * Filter contacts by phone number
            * Allowed modifiers: phone_number[ne], phone_number[prefix],
                phone_number[not_prefix], phone_number[gte], phone_number[gt], phone_number[lt],
                phone_number[lte]
        
        - time_created (UNIX timestamp)
            * Filter contacts by time created
            * Allowed modifiers: time_created[ne], time_created[min], time_created[max]
        
        - last_message_time (UNIX timestamp)
            * Filter contacts by last time a message was sent or received
            * Allowed modifiers: last_message_time[exists], last_message_time[ne],
                last_message_time[min], last_message_time[max]
        
        - vars (associative array)
            * Filter contacts by value of a custom variable (e.g. vars[email], vars[foo], etc.)
            * Allowed modifiers: vars[foo][exists], vars[foo][ne], vars[foo][prefix],
                vars[foo][not_prefix], vars[foo][gte], vars[foo][gt], vars[foo][lt], vars[foo][lte],
                vars[foo][min], vars[foo][max]
        
        - sort
            * Sort the results based on a field
            * Allowed values: default, name, phone_number, last_message_time
            * Default: default
        
        - sort_dir
            * Sort the results in ascending or descending order
            * Allowed values: asc, desc
            * Default: asc
        
        - page_size (int)
            * Number of results returned per page (max 200)
            * Default: 50
        
        - offset (int)
            * Number of items to skip from beginning of result set
            * Default: 0
      
    Returns:
        APICursor (of Contact)
    */
Project.prototype.queryContacts = function(options)
{
    return this.api.cursor(require('./contact'), this.getBaseApiPath() + "/contacts", options);
};

/**
    project.getContactById(id, callback)
    
    Retrieves the contact with the given ID.
    
    Arguments:
      - id
          * ID of the contact
          * Required
      
      - callback : function(err, contact)
          * Required
    */
Project.prototype.getContactById = function(id, callback)
{
    this.api.doRequest("GET", this.getBaseApiPath() + "/contacts/" + id, null, this.api.wrapCallback(require('./contact'), callback));
};

/**
    project.initContactById(id)
    
    Initializes the Telerivet contact with the given ID without making an API request.
    
    Arguments:
      - id
          * ID of the contact
          * Required
      
    Returns:
        Contact
    */
Project.prototype.initContactById = function(id)
{
    var Contact = require('./contact');
    return new Contact(this.api, {'project_id': this.id, 'id': id}, false);
};

/**
    project.queryPhones(options)
    
    Queries phones within the given project.
    
    Arguments:
      - options (associative array)
        
        - name
            * Filter phones by name
            * Allowed modifiers: name[ne], name[prefix], name[not_prefix], name[gte], name[gt],
                name[lt], name[lte]
        
        - phone_number
            * Filter phones by phone number
            * Allowed modifiers: phone_number[ne], phone_number[prefix],
                phone_number[not_prefix], phone_number[gte], phone_number[gt], phone_number[lt],
                phone_number[lte]
        
        - last_active_time (UNIX timestamp)
            * Filter phones by last active time
            * Allowed modifiers: last_active_time[exists], last_active_time[ne],
                last_active_time[min], last_active_time[max]
        
        - sort
            * Sort the results based on a field
            * Allowed values: default, name, phone_number
            * Default: default
        
        - sort_dir
            * Sort the results in ascending or descending order
            * Allowed values: asc, desc
            * Default: asc
        
        - page_size (int)
            * Number of results returned per page (max 200)
            * Default: 50
        
        - offset (int)
            * Number of items to skip from beginning of result set
            * Default: 0
      
    Returns:
        APICursor (of Phone)
    */
Project.prototype.queryPhones = function(options)
{
    return this.api.cursor(require('./phone'), this.getBaseApiPath() + "/phones", options);
};

/**
    project.getPhoneById(id, callback)
    
    Retrieves the phone with the given ID.
    
    Arguments:
      - id
          * ID of the phone - see <https://telerivet.com/dashboard/api>
          * Required
      
      - callback : function(err, phone)
          * Required
    */
Project.prototype.getPhoneById = function(id, callback)
{
    this.api.doRequest("GET", this.getBaseApiPath() + "/phones/" + id, null, this.api.wrapCallback(require('./phone'), callback));
};

/**
    project.initPhoneById(id)
    
    Initializes the phone with the given ID without making an API request.
    
    Arguments:
      - id
          * ID of the phone - see <https://telerivet.com/dashboard/api>
          * Required
      
    Returns:
        Phone
    */
Project.prototype.initPhoneById = function(id)
{
    var Phone = require('./phone');
    return new Phone(this.api, {'project_id': this.id, 'id': id}, false);
};

/**
    project.queryMessages(options)
    
    Queries messages within the given project.
    
    Arguments:
      - options (associative array)
        
        - direction
            * Filter messages by direction
            * Allowed values: incoming, outgoing
        
        - message_type
            * Filter messages by message_type
            * Allowed values: sms, mms, ussd, call
        
        - source
            * Filter messages by source
            * Allowed values: phone, provider, web, api, service, webhook, scheduled
        
        - starred (bool)
            * Filter messages by starred/unstarred
        
        - status
            * Filter messages by status
            * Allowed values: ignored, processing, received, sent, queued, failed,
                failed_queued, cancelled, delivered, not_delivered
        
        - time_created[min] (UNIX timestamp)
            * Filter messages created on or after a particular time
        
        - time_created[max] (UNIX timestamp)
            * Filter messages created before a particular time
        
        - contact_id
            * ID of the contact who sent/received the message
        
        - phone_id
            * ID of the phone that sent/received the message
        
        - sort
            * Sort the results based on a field
            * Allowed values: default
            * Default: default
        
        - sort_dir
            * Sort the results in ascending or descending order
            * Allowed values: asc, desc
            * Default: asc
        
        - page_size (int)
            * Number of results returned per page (max 200)
            * Default: 50
        
        - offset (int)
            * Number of items to skip from beginning of result set
            * Default: 0
      
    Returns:
        APICursor (of Message)
    */
Project.prototype.queryMessages = function(options)
{
    return this.api.cursor(require('./message'), this.getBaseApiPath() + "/messages", options);
};

/**
    project.getMessageById(id, callback)
    
    Retrieves the message with the given ID.
    
    Arguments:
      - id
          * ID of the message
          * Required
      
      - callback : function(err, message)
          * Required
    */
Project.prototype.getMessageById = function(id, callback)
{
    this.api.doRequest("GET", this.getBaseApiPath() + "/messages/" + id, null, this.api.wrapCallback(require('./message'), callback));
};

/**
    project.initMessageById(id)
    
    Initializes the Telerivet message with the given ID without making an API request.
    
    Arguments:
      - id
          * ID of the message
          * Required
      
    Returns:
        Message
    */
Project.prototype.initMessageById = function(id)
{
    var Message = require('./message');
    return new Message(this.api, {'project_id': this.id, 'id': id}, false);
};

/**
    project.queryGroups(options)
    
    Queries groups within the given project.
    
    Arguments:
      - options (associative array)
        
        - name
            * Filter groups by name
            * Allowed modifiers: name[ne], name[prefix], name[not_prefix], name[gte], name[gt],
                name[lt], name[lte]
        
        - sort
            * Sort the results based on a field
            * Allowed values: default, name
            * Default: default
        
        - sort_dir
            * Sort the results in ascending or descending order
            * Allowed values: asc, desc
            * Default: asc
        
        - page_size (int)
            * Number of results returned per page (max 200)
            * Default: 50
        
        - offset (int)
            * Number of items to skip from beginning of result set
            * Default: 0
      
    Returns:
        APICursor (of Group)
    */
Project.prototype.queryGroups = function(options)
{
    return this.api.cursor(require('./group'), this.getBaseApiPath() + "/groups", options);
};

/**
    project.getOrCreateGroup(name, callback)
    
    Retrieves or creates a group by name.
    
    Arguments:
      - name
          * Name of the group
          * Required
      
      - callback : function(err, group)
          * Required
    */
Project.prototype.getOrCreateGroup = function(name, callback)
{
    this.api.doRequest("POST", this.getBaseApiPath() + "/groups", {'name': name}, this.api.wrapCallback(require('./group'), callback));
};

/**
    project.getGroupById(id, callback)
    
    Retrieves the group with the given ID.
    
    Arguments:
      - id
          * ID of the group
          * Required
      
      - callback : function(err, group)
          * Required
    */
Project.prototype.getGroupById = function(id, callback)
{
    this.api.doRequest("GET", this.getBaseApiPath() + "/groups/" + id, null, this.api.wrapCallback(require('./group'), callback));
};

/**
    project.initGroupById(id)
    
    Initializes the group with the given ID without making an API request.
    
    Arguments:
      - id
          * ID of the group
          * Required
      
    Returns:
        Group
    */
Project.prototype.initGroupById = function(id)
{
    var Group = require('./group');
    return new Group(this.api, {'project_id': this.id, 'id': id}, false);
};

/**
    project.queryLabels(options)
    
    Queries labels within the given project.
    
    Arguments:
      - options (associative array)
        
        - name
            * Filter labels by name
            * Allowed modifiers: name[ne], name[prefix], name[not_prefix], name[gte], name[gt],
                name[lt], name[lte]
        
        - sort
            * Sort the results based on a field
            * Allowed values: default, name
            * Default: default
        
        - sort_dir
            * Sort the results in ascending or descending order
            * Allowed values: asc, desc
            * Default: asc
        
        - page_size (int)
            * Number of results returned per page (max 200)
            * Default: 50
        
        - offset (int)
            * Number of items to skip from beginning of result set
            * Default: 0
      
    Returns:
        APICursor (of Label)
    */
Project.prototype.queryLabels = function(options)
{
    return this.api.cursor(require('./label'), this.getBaseApiPath() + "/labels", options);
};

/**
    project.getOrCreateLabel(name, callback)
    
    Gets or creates a label by name.
    
    Arguments:
      - name
          * Name of the label
          * Required
      
      - callback : function(err, label)
          * Required
    */
Project.prototype.getOrCreateLabel = function(name, callback)
{
    this.api.doRequest("POST", this.getBaseApiPath() + "/labels", {'name': name}, this.api.wrapCallback(require('./label'), callback));
};

/**
    project.getLabelById(id, callback)
    
    Retrieves the label with the given ID.
    
    Arguments:
      - id
          * ID of the label
          * Required
      
      - callback : function(err, label)
          * Required
    */
Project.prototype.getLabelById = function(id, callback)
{
    this.api.doRequest("GET", this.getBaseApiPath() + "/labels/" + id, null, this.api.wrapCallback(require('./label'), callback));
};

/**
    project.initLabelById(id)
    
    Initializes the label with the given ID without making an API request.
    
    Arguments:
      - id
          * ID of the label
          * Required
      
    Returns:
        Label
    */
Project.prototype.initLabelById = function(id)
{
    var Label = require('./label');
    return new Label(this.api, {'project_id': this.id, 'id': id}, false);
};

/**
    project.queryDataTables(options)
    
    Queries data tables within the given project.
    
    Arguments:
      - options (associative array)
        
        - name
            * Filter data tables by name
            * Allowed modifiers: name[ne], name[prefix], name[not_prefix], name[gte], name[gt],
                name[lt], name[lte]
        
        - sort
            * Sort the results based on a field
            * Allowed values: default, name
            * Default: default
        
        - sort_dir
            * Sort the results in ascending or descending order
            * Allowed values: asc, desc
            * Default: asc
        
        - page_size (int)
            * Number of results returned per page (max 200)
            * Default: 50
        
        - offset (int)
            * Number of items to skip from beginning of result set
            * Default: 0
      
    Returns:
        APICursor (of DataTable)
    */
Project.prototype.queryDataTables = function(options)
{
    return this.api.cursor(require('./datatable'), this.getBaseApiPath() + "/tables", options);
};

/**
    project.getOrCreateDataTable(name, callback)
    
    Gets or creates a data table by name.
    
    Arguments:
      - name
          * Name of the data table
          * Required
      
      - callback : function(err, table)
          * Required
    */
Project.prototype.getOrCreateDataTable = function(name, callback)
{
    this.api.doRequest("POST", this.getBaseApiPath() + "/tables", {'name': name}, this.api.wrapCallback(require('./datatable'), callback));
};

/**
    project.getDataTableById(id, callback)
    
    Retrieves the data table with the given ID.
    
    Arguments:
      - id
          * ID of the data table
          * Required
      
      - callback : function(err, table)
          * Required
    */
Project.prototype.getDataTableById = function(id, callback)
{
    this.api.doRequest("GET", this.getBaseApiPath() + "/tables/" + id, null, this.api.wrapCallback(require('./datatable'), callback));
};

/**
    project.initDataTableById(id)
    
    Initializes the data table with the given ID without making an API request.
    
    Arguments:
      - id
          * ID of the data table
          * Required
      
    Returns:
        DataTable
    */
Project.prototype.initDataTableById = function(id)
{
    var DataTable = require('./datatable');
    return new DataTable(this.api, {'project_id': this.id, 'id': id}, false);
};

/**
    project.queryScheduledMessages(options)
    
    Queries scheduled messages within the given project.
    
    Arguments:
      - options (associative array)
        
        - message_type
            * Filter scheduled messages by message_type
            * Allowed values: sms, mms, ussd, call
        
        - time_created (UNIX timestamp)
            * Filter scheduled messages by time_created
            * Allowed modifiers: time_created[ne], time_created[min], time_created[max]
        
        - next_time (UNIX timestamp)
            * Filter scheduled messages by next_time
            * Allowed modifiers: next_time[exists], next_time[ne], next_time[min],
                next_time[max]
        
        - sort
            * Sort the results based on a field
            * Allowed values: default, name
            * Default: default
        
        - sort_dir
            * Sort the results in ascending or descending order
            * Allowed values: asc, desc
            * Default: asc
        
        - page_size (int)
            * Number of results returned per page (max 200)
            * Default: 50
        
        - offset (int)
            * Number of items to skip from beginning of result set
            * Default: 0
      
    Returns:
        APICursor (of ScheduledMessage)
    */
Project.prototype.queryScheduledMessages = function(options)
{
    return this.api.cursor(require('./scheduledmessage'), this.getBaseApiPath() + "/scheduled", options);
};

/**
    project.getScheduledMessageById(id, callback)
    
    Retrieves the scheduled message with the given ID.
    
    Arguments:
      - id
          * ID of the scheduled message
          * Required
      
      - callback : function(err, scheduled_msg)
          * Required
    */
Project.prototype.getScheduledMessageById = function(id, callback)
{
    this.api.doRequest("GET", this.getBaseApiPath() + "/scheduled/" + id, null, this.api.wrapCallback(require('./scheduledmessage'), callback));
};

/**
    project.initScheduledMessageById(id)
    
    Initializes the scheduled message with the given ID without making an API request.
    
    Arguments:
      - id
          * ID of the scheduled message
          * Required
      
    Returns:
        ScheduledMessage
    */
Project.prototype.initScheduledMessageById = function(id)
{
    var ScheduledMessage = require('./scheduledmessage');
    return new ScheduledMessage(this.api, {'project_id': this.id, 'id': id}, false);
};

/**
    project.queryServices(options)
    
    Queries services within the given project.
    
    Arguments:
      - options (associative array)
        
        - name
            * Filter services by name
            * Allowed modifiers: name[ne], name[prefix], name[not_prefix], name[gte], name[gt],
                name[lt], name[lte]
        
        - active (bool)
            * Filter services by active/inactive state
        
        - context
            * Filter services that can be invoked in a particular context
            * Allowed values: message, contact, project, receipt
        
        - sort
            * Sort the results based on a field
            * Allowed values: default, priority, name
            * Default: default
        
        - sort_dir
            * Sort the results in ascending or descending order
            * Allowed values: asc, desc
            * Default: asc
        
        - page_size (int)
            * Number of results returned per page (max 200)
            * Default: 50
        
        - offset (int)
            * Number of items to skip from beginning of result set
            * Default: 0
      
    Returns:
        APICursor (of Service)
    */
Project.prototype.queryServices = function(options)
{
    return this.api.cursor(require('./service'), this.getBaseApiPath() + "/services", options);
};

/**
    project.getServiceById(id, callback)
    
    Retrieves the service with the given ID.
    
    Arguments:
      - id
          * ID of the service
          * Required
      
      - callback : function(err, service)
          * Required
    */
Project.prototype.getServiceById = function(id, callback)
{
    this.api.doRequest("GET", this.getBaseApiPath() + "/services/" + id, null, this.api.wrapCallback(require('./service'), callback));
};

/**
    project.initServiceById(id)
    
    Initializes the service with the given ID without making an API request.
    
    Arguments:
      - id
          * ID of the service
          * Required
      
    Returns:
        Service
    */
Project.prototype.initServiceById = function(id)
{
    var Service = require('./service');
    return new Service(this.api, {'project_id': this.id, 'id': id}, false);
};

/**
    project.queryReceipts(options)
    
    Queries mobile money receipts within the given project.
    
    Arguments:
      - options (associative array)
        
        - tx_id
            * Filter receipts by transaction ID
        
        - tx_type
            * Filter receipts by transaction type
            * Allowed values: receive_money, send_money, pay_bill, deposit, withdrawal,
                airtime_purchase, balance_inquiry, reversal
        
        - tx_time (UNIX timestamp)
            * Filter receipts by transaction time
            * Allowed modifiers: tx_time[ne], tx_time[min], tx_time[max]
        
        - name
            * Filter receipts by other person's name
            * Allowed modifiers: name[ne], name[prefix], name[not_prefix], name[gte], name[gt],
                name[lt], name[lte]
        
        - phone_number
            * Filter receipts by other person's phone number
            * Allowed modifiers: phone_number[ne], phone_number[prefix],
                phone_number[not_prefix], phone_number[gte], phone_number[gt], phone_number[lt],
                phone_number[lte]
        
        - sort
            * Sort the results based on a field
            * Allowed values: default
            * Default: default
        
        - sort_dir
            * Sort the results in ascending or descending order
            * Allowed values: asc, desc
            * Default: asc
        
        - page_size (int)
            * Number of results returned per page (max 200)
            * Default: 50
        
        - offset (int)
            * Number of items to skip from beginning of result set
            * Default: 0
      
    Returns:
        APICursor (of MobileMoneyReceipt)
    */
Project.prototype.queryReceipts = function(options)
{
    return this.api.cursor(require('./mobilemoneyreceipt'), this.getBaseApiPath() + "/receipts", options);
};

/**
    project.getReceiptById(id, callback)
    
    Retrieves the mobile money receipt with the given ID.
    
    Arguments:
      - id
          * ID of the mobile money receipt
          * Required
      
      - callback : function(err, receipt)
          * Required
    */
Project.prototype.getReceiptById = function(id, callback)
{
    this.api.doRequest("GET", this.getBaseApiPath() + "/receipts/" + id, null, this.api.wrapCallback(require('./mobilemoneyreceipt'), callback));
};

/**
    project.initReceiptById(id)
    
    Initializes the mobile money receipt with the given ID without making an API request.
    
    Arguments:
      - id
          * ID of the mobile money receipt
          * Required
      
    Returns:
        MobileMoneyReceipt
    */
Project.prototype.initReceiptById = function(id)
{
    var MobileMoneyReceipt = require('./mobilemoneyreceipt');
    return new MobileMoneyReceipt(this.api, {'project_id': this.id, 'id': id}, false);
};

/**
    project.queryRoutes(options)
    
    Queries custom routes that can be used to send messages (not including Phones).
    
    Arguments:
      - options (associative array)
        
        - name
            * Filter routes by name
            * Allowed modifiers: name[ne], name[prefix], name[not_prefix], name[gte], name[gt],
                name[lt], name[lte]
        
        - sort
            * Sort the results based on a field
            * Allowed values: default, name
            * Default: default
        
        - sort_dir
            * Sort the results in ascending or descending order
            * Allowed values: asc, desc
            * Default: asc
        
        - page_size (int)
            * Number of results returned per page (max 200)
            * Default: 50
        
        - offset (int)
            * Number of items to skip from beginning of result set
            * Default: 0
      
    Returns:
        APICursor (of Route)
    */
Project.prototype.queryRoutes = function(options)
{
    return this.api.cursor(require('./route'), this.getBaseApiPath() + "/routes", options);
};

/**
    project.getRouteById(id, callback)
    
    Gets a custom route by ID
    
    Arguments:
      - id
          * ID of the route
          * Required
      
      - callback : function(err, route)
          * Required
    */
Project.prototype.getRouteById = function(id, callback)
{
    this.api.doRequest("GET", this.getBaseApiPath() + "/routes/" + id, null, this.api.wrapCallback(require('./route'), callback));
};

/**
    project.initRouteById(id)
    
    Initializes a custom route by ID without making an API request.
    
    Arguments:
      - id
          * ID of the route
          * Required
      
    Returns:
        Route
    */
Project.prototype.initRouteById = function(id)
{
    var Route = require('./route');
    return new Route(this.api, {'project_id': this.id, 'id': id}, false);
};

/**
    project.save(callback)
    
    Saves any fields or custom variables that have changed for the project.
    
      - callback : function(err)
          * Required
    */
Project.prototype.save = function(callback)
{
    Entity.prototype.save.call(this, callback);
};

Object.defineProperty(Project.prototype, 'id', {
    enumerable: true,
    get: function() { return this.get('id'); },
    set: function(value) { throw new Error('id is not writable'); }
});    

Object.defineProperty(Project.prototype, 'name', {
    enumerable: true,
    get: function() { return this.get('name'); },
    set: function(value) { this.set('name', value); }
});    

Object.defineProperty(Project.prototype, 'timezone_id', {
    enumerable: true,
    get: function() { return this.get('timezone_id'); },
    set: function(value) { throw new Error('timezone_id is not writable'); }
});    

Project.prototype.getBaseApiPath = function()
{
    return "/projects/" + this.get("id");
};

module.exports = Project;

