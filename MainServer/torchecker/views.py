"""
API views for TOR checking and OCR processing.
Views are thin - business logic is in services.
"""
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status, viewsets
from django.core.files.storage import default_storage
from core.responses import APIResponse
from core.exceptions import ServiceException
from core.decorators import handle_service_exceptions
from .services.ocr_service import OCRService
from .services.tor_service import TorService
from .serializers import TorTransfereeSerializer, UniqueStudentSerializer
from .models import TorTransferee, TorDocument
from curriculum.models import CitTorContent
import logging

logger = logging.getLogger(__name__)


class TorTransfereeViewSet(viewsets.ModelViewSet):
    """ViewSet for TorTransferee CRUD operations"""
    
    serializer_class = TorTransfereeSerializer
    
    def get_queryset(self):
        """Get queryset with optional filtering"""
        queryset = TorTransferee.objects.all()
        
        # Filter by account_id if provided
        account_id = self.request.query_params.get('account_id')
        if account_id:
            queryset = queryset.filter(account_id=account_id)
        
        return queryset
    
    def list(self, request):
        """List unique students or all entries"""
        # If unique=true, return unique student/school combinations
        if request.query_params.get('unique') == 'true':
            unique_students = TorService.get_unique_students()
            serializer = UniqueStudentSerializer(unique_students, many=True)
            return APIResponse.success(serializer.data)
        
        # Otherwise return normal list
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return APIResponse.success(serializer.data)


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
@handle_service_exceptions
def ocr_view(request):
    """
    Process uploaded TOR images with OCR.
    
    POST /api/ocr/
    
    Form Data:
        - images: Multiple image files
        - account_id: Student account ID
    
    Response:
        {
            "success": true,
            "data": {
                "student_name": "John Doe",
                "school_name": "Previous University",
                "ocr_results": [...],
                "school_tor": [...]
            }
        }
    """
    files = request.FILES.getlist("images")
    account_id = request.data.get("account_id")
    
    if not files:
        return APIResponse.error("No images uploaded")
    
    if not account_id:
        return APIResponse.error("account_id is required")
    
    # Initialize OCR service
    ocr_service = OCRService()
    
    # Process images
    all_results = ocr_service.process_images(files, account_id)
    
    # Extract student info from first result
    student_name = None
    school_name = None
    all_entries = []
    
    for result in all_results:
        if not student_name and result.get('student_name'):
            student_name = result['student_name']
        if not school_name and result.get('school_name'):
            school_name = result['school_name']
        
        # Save entries to database
        if result.get('entries'):
            saved = TorService.save_tor_entries(
                account_id=account_id,
                student_name=student_name or "Unknown",
                school_name=school_name or "Unknown",
                entries=result['entries']
            )
            
            # Convert to dict for response
            for entry in saved:
                all_entries.append({
                    "id": entry.id,
                    "subject_code": entry.subject_code,
                    "subject_description": entry.subject_description,
                    "student_year": entry.student_year,
                    "semester": entry.semester,
                    "school_year_offered": entry.school_year_offered,
                    "total_academic_units": entry.total_academic_units,
                    "final_grade": entry.final_grade,
                    "remarks": entry.remarks,
                })
    
    # Get school TOR for reference
    school_tor = list(
        CitTorContent.objects.filter(is_active=True).values(
            "subject_code", "prerequisite", "description", "units"
        )
    )
    
    return APIResponse.success({
        "student_name": student_name,
        "school_name": school_name,
        "ocr_results": all_entries,
        "school_tor": school_tor,
    })


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
@handle_service_exceptions
def demo_ocr_view(request):
    """
    Demo OCR endpoint for testing without saving to database.
    
    POST /api/demo-ocr/
    
    Form Data:
        - images: Multiple image files
    """
    files = request.FILES.getlist("images")
    
    if not files:
        return APIResponse.error("No images uploaded")
    
    # Initialize OCR service
    ocr_service = OCRService()
    
    # Process images
    all_results = ocr_service.process_images(files)
    
    return APIResponse.success({"results": all_results})


@api_view(['GET'])
def tor_transferee_list(request):
    """
    Get list of TOR transferee entries.
    
    GET /api/tor-transferees/?account_id=STUDENT001
    """
    account_id = request.GET.get('account_id')
    student_name = request.GET.get('student_name')
    
    entries = TorService.get_tor_entries(
        account_id=account_id,
        student_name=student_name
    )
    
    serializer = TorTransfereeSerializer(entries, many=True)
    
    return APIResponse.success(serializer.data)


@api_view(['DELETE'])
@handle_service_exceptions
def delete_ocr_entries(request):
    """
    Delete OCR entries for an account.
    
    DELETE /api/ocr/delete?account_id=STUDENT001
    """
    account_id = request.query_params.get('account_id')
    
    if not account_id:
        return APIResponse.error("account_id parameter is required")
    
    # Delete TOR entries
    tor_deleted = TorService.delete_tor_entries(account_id)
    
    # Delete comparison results
    from curriculum.models import CompareResultTOR
    compare_deleted, _ = CompareResultTOR.objects.filter(
        account_id=account_id
    ).delete()
    
    return APIResponse.success({
        "tor_deleted": tor_deleted,
        "compare_deleted": compare_deleted,
    }, message="Entries deleted successfully")


@api_view(['GET'])
@handle_service_exceptions
def get_tor_statistics(request):
    """
    Get TOR statistics for an account.
    
    GET /api/tor-statistics/?account_id=STUDENT001
    """
    account_id = request.GET.get('account_id')
    
    if not account_id:
        return APIResponse.error("account_id parameter is required")
    
    stats = TorService.get_tor_statistics(account_id)
    
    return APIResponse.success(stats)
