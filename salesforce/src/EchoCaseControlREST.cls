@RestResource(urlMapping='/EchoCaseControl/*')
global with sharing class EchoCaseControlREST {
    
    @HttpGet
    global static Case GetCurrentCase() {
        Echo_Case_Result__c ecr = EchoCaseSearchREST.GetCase(null);
        if(ecr != null) {
            ecr.Action__c = 'Open';
          update ecr;
        
          Case c = [SELECT Id, CaseNumber, Subject, Priority, Status from Case WHERE ID =: ecr.Case__c];
          return c;
        } else {
            return null;
        }
    }
    
    @HttpPost
    global static Case UpdateCase(string priority, string status, string CaseIdentifier) {
        Echo_Case_Result__c ecr = EchoCaseSearchREST.GetCase(CaseIdentifier);
        ecr.Action__c = 'Update';
        update ecr;
            
        Case c = [SELECT Id, CaseNumber, Priority, Status from Case WHERE ID =: ecr.Case__c];
        if(c != null) {
            if(priority != null) { c.Priority = priority; }
            if(status != null) { c.Status = status; }
          update c;
            return c;
        } else {
            return null;
        }
    }
    
}
