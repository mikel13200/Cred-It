"""
Views for requestTOR app using WorkflowService.
Notice how much simpler this is compared to the old code!
"""
from rest_framework.decorators import api_view
from core.responses import APIResponse
from core.exceptions import ServiceException
from core.decorators import handle_service_exceptions
from core.services.workflow import WorkflowService
from .models import RequestTOR
from .serializers import RequestTORSerializer
from profiles.models import Profile
from pendingRequest.models import PendingRequest
from finalDocuments.models import listFinalTor
import logging

logger = logging.getLogger(__name__)


@api_view(['POST'])
@handle_service_exceptions
def create_request_tor(request):
    """
    Create a new TOR request.
    
    POST /api/request-tor/
    
    Request:
        {
            "account_id": "STUDENT001"
        }
    """
    account_id = request.data.get("account_id")
    
    if not account_id:
        return APIResponse.error("account_id is required")
    
    # Check if profile exists
    try:
        profile = Profile.objects.get(user_id=account_id)
    except Profile.DoesNotExist:
        return APIResponse.error(
            "Please complete your profile first. This can be found in the Navbar"
        )
    
    # Check if request already exists
    if RequestTOR.objects.filter(accountID=account_id).exists():
        return APIResponse.error(
            "You already have a pending request. Please wait for it to be processed."
        )
    
    # Create request
    request_tor = RequestTOR.objects.create(
        accountID=account_id,
        applicant_name=profile.name or account_id
    )
    
    serializer = RequestTORSerializer(request_tor)
    
    return APIResponse.created(
        serializer.data,
        "TOR request created successfully"
    )


@api_view(['GET'])
def get_all_requests(request):
    """
    Get all TOR requests.
    
    GET /api/requestTOR/
    """
    requests = WorkflowService.get_workflow_records(
        model=RequestTOR,
        order_by=['-request_date']
    )
    
    serializer = RequestTORSerializer(requests, many=True)
    return APIResponse.success(serializer.data)


@api_view(['POST'])
@handle_service_exceptions
def update_request_tor_status(request):
    """
    Update status of a TOR request.
    
    POST /api/update_status/
    
    Request:
        {
            "account_id": "STUDENT001",
            "status": "Accepted"
        }
    """
    account_id = request.data.get("account_id")
    new_status = request.data.get("status")
    
    updated = WorkflowService.update_status(
        model=RequestTOR,
        account_id=account_id,
        new_status=new_status,
        field_name='accountID'
    )
    
    serializer = RequestTORSerializer(updated)
    
    return APIResponse.success(
        serializer.data,
        f"Status updated to {new_status}"
    )


@api_view(['POST'])
@handle_service_exceptions
def accept_request(request):
    """
    Accept request and move to PendingRequest stage.
    
    POST /api/accept-request/
    
    Request:
        {
            "account_id": "STUDENT001"
        }
    """
    account_id = request.data.get("account_id")
    
    # Use WorkflowService to transition
    WorkflowService.transition_to_next_stage(
        account_id=account_id,
        from_model=RequestTOR,
        to_model=PendingRequest,
        from_field='accountID',
        to_field='applicant_id',
        status_update='Pending',
        delete_from=True
    )
    
    return APIResponse.success(
        message="Request accepted and moved to pending review"
    )


@api_view(['DELETE'])
@handle_service_exceptions
def deny_request(request, applicant_id):
    """
    Deny request and clean up all related data.
    
    DELETE /api/deny/<applicant_id>/
    """
    from profiles.models import Profile
    from curriculum.models import CompareResultTOR
    
    # Use WorkflowService for bulk cleanup
    deleted = WorkflowService.bulk_delete_related(
        account_id=applicant_id,
        models_to_clean=[
            (Profile, 'user_id'),
            (CompareResultTOR, 'account_id'),
            (RequestTOR, 'accountID'),
        ]
    )
    
    return APIResponse.success(
        deleted,
        "Request denied and all related data deleted"
    )


@api_view(['DELETE'])
@handle_service_exceptions
def cancel_request(request, account_id):
    """
    Cancel request by user. 
    Only deletes the request and TOR results, preserving the Profile.
    
    DELETE /api/cancel-request/<account_id>/
    """
    from curriculum.models import CompareResultTOR
    
    # Use WorkflowService for bulk cleanup
    deleted = WorkflowService.bulk_delete_related(
        account_id=account_id,
        models_to_clean=[
            (CompareResultTOR, 'account_id'),
            (RequestTOR, 'accountID'),
        ]
    )
    
    return APIResponse.success(
        deleted,
        "Request cancelled successfully"
    )


@api_view(['POST'])
@handle_service_exceptions
def finalize_request(request):
    """
    Finalize request and move to final documents.
    
    POST /api/finalize_request/
    
    Request:
        {
            "account_id": "STUDENT001"
        }
    """
    account_id = request.data.get("account_id")
    
    # Transition to final stage
    WorkflowService.transition_to_next_stage(
        account_id=account_id,
        from_model=RequestTOR,
        to_model=listFinalTor,
        from_field='accountID',
        to_field='accountID',
        status_update='Finalized',
        delete_from=True
    )
    
    return APIResponse.success(
        message="Request finalized successfully"
    )


@api_view(['GET'])
@handle_service_exceptions
def track_user_progress(request):
    """
    Check if user has a request in this stage.
    
    GET /api/track_user_progress/?accountID=STUDENT001
    """
    account_id = request.GET.get('accountID')
    
    requests = WorkflowService.get_workflow_records(
        model=RequestTOR,
        account_id=account_id,
        field_name='accountID',
        order_by=['-request_date']
    )
    
    # Return data if exists, else empty list
    # We serialize basic info
    data = []
    if requests.exists():
        for req in requests[:5]:  # Limit to 5
            data.append({
                'id': req.id,
                'account_id': req.accountID,
                'created_at': req.request_date,
                'status': req.status,
                'type': 'request'
            })

        # Attach TOR URL if available
        # Get latest TOR document
        from torchecker.models import TorDocument
        latest_doc = TorDocument.objects.filter(account_id=account_id).first()
        tor_url = latest_doc.file.url if latest_doc else None
        
        for item in data:
            item['tor_url'] = tor_url
            
    return APIResponse.success({'data': data, 'exists': len(data) > 0})