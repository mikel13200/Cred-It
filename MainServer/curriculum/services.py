"""
Business logic for curriculum comparison operations.
All curriculum comparison logic should be here.
"""
from typing import List, Dict, Optional, Tuple
from difflib import SequenceMatcher
from django.db.models import QuerySet, Q
from django.db import transaction, models
from core.exceptions import (
    ValidationException,
    ResourceNotFoundException,
    BusinessLogicException
)
from core.decorators import log_execution, atomic_transaction
from .models import CompareResultTOR, CitTorContent
import logging

logger = logging.getLogger(__name__)


class CurriculumService:
    """
    Service class for curriculum comparison operations.
    Handles TOR comparison, grading, and credit evaluation.
    """
    
    # Grading thresholds
    STANDARD_PASSING_MIN = 1.0
    STANDARD_PASSING_MAX = 2.9
    STANDARD_FAILING_MIN = 3.0
    STANDARD_FAILING_MAX = 5.0
    
    # Similarity threshold
    SIMILARITY_THRESHOLD = 20.0  # Minimum % for match
    
    @staticmethod
    def calculate_similarity(text1: str, text2: str) -> float:
        """
        Calculate similarity percentage between two texts.
        
        Args:
            text1: First text
            text2: Second text
            
        Returns:
            Similarity percentage (0-100)
        """
        if not text1 or not text2:
            return 0.0
        
        ratio = SequenceMatcher(None, text1.lower(), text2.lower()).ratio()
        return ratio * 100
    
    @staticmethod
    def generate_summary(
        entry: CompareResultTOR,
        cit_entries: QuerySet[CitTorContent]
    ) -> str:
        """
        Generate detailed comparison summary for a TOR entry.
        
        Args:
            entry: CompareResultTOR instance
            cit_entries: QuerySet of CitTorContent
            
        Returns:
            Generated summary text
        """
        lines = []
        
        # Subject Code check
        matches = cit_entries.filter(subject_code=entry.subject_code)
        match_count = matches.count()
        
        if match_count == 0:
            lines.append("⚠ Subject Code: No matches found in CIT curriculum")
        elif match_count == 1:
            lines.append("✓ Subject Code: Exact match found in CIT curriculum")
        else:
            lines.append(f"⚠ Subject Code: {match_count} matches found (review needed)")
        
        # Description similarity
        best_match = 0.0
        best_match_subject = None
        
        for cit in cit_entries:
            for desc in cit.description:
                similarity = CurriculumService.calculate_similarity(
                    entry.subject_description,
                    desc
                )
                if similarity > best_match:
                    best_match = similarity
                    best_match_subject = cit.subject_code
        
        if best_match >= 80:
            lines.append(f"✓ Description: {best_match:.1f}% match with {best_match_subject}")
        elif best_match >= 50:
            lines.append(f"⚠ Description: {best_match:.1f}% match with {best_match_subject} (review needed)")
        else:
            lines.append(f"✗ Description: Low similarity ({best_match:.1f}%)")
        
        # Units check
        units_match = cit_entries.filter(
            units=int(entry.total_academic_units)
        ).exists()
        
        if units_match:
            lines.append(f"✓ Units: {int(entry.total_academic_units)} units matches curriculum")
        else:
            lines.append(f"⚠ Units: {int(entry.total_academic_units)} units - verify equivalency")
        
        # Grade check
        if entry.is_passing_grade:
            lines.append(f"✓ Grade: {entry.final_grade} (Passing)")
        else:
            lines.append(f"✗ Grade: {entry.final_grade} (Not passing)")
        
        return "\n".join(lines)
    
    @staticmethod
    @log_execution
    @atomic_transaction
    def apply_standard_grading(account_id: str) -> List[CompareResultTOR]:
        """
        Apply standard grading system (1.0-2.9 = PASSED, 3.0-5.0 = FAILED).
        
        Args:
            account_id: Student account ID
            
        Returns:
            List of updated CompareResultTOR instances
            
        Raises:
            ValidationException: If account_id is missing
            ResourceNotFoundException: If no entries found
        """
        if not account_id:
            raise ValidationException("Account ID is required")
        
        entries = CompareResultTOR.objects.filter(account_id=account_id)
        
        if not entries.exists():
            raise ResourceNotFoundException("TOR entries", account_id)
        
        cit_entries = CitTorContent.objects.filter(is_active=True)
        updated_entries = []
        
        for entry in entries:
            # Apply standard grading
            if CurriculumService.STANDARD_PASSING_MIN <= entry.final_grade <= CurriculumService.STANDARD_PASSING_MAX:
                entry.remarks = "PASSED"
            elif CurriculumService.STANDARD_FAILING_MIN <= entry.final_grade <= CurriculumService.STANDARD_FAILING_MAX:
                entry.remarks = "FAILED"
            else:
                entry.remarks = "INVALID GRADE"
            
            # Generate summary
            entry.summary = CurriculumService.generate_summary(entry, cit_entries)
            updated_entries.append(entry)
        
        # Bulk update
        CompareResultTOR.objects.bulk_update(
            updated_entries,
            ['remarks', 'summary', 'updated_at'],
            batch_size=100
        )
        
        logger.info(
            f"Applied standard grading for {len(updated_entries)} entries "
            f"for account: {account_id}"
        )
        
        return updated_entries
    
    @staticmethod
    @log_execution
    @atomic_transaction
    def apply_reverse_grading(account_id: str) -> List[CompareResultTOR]:
        """
        Apply reverse grading system (3.0-5.0 = PASSED, 1.0-2.9 = FAILED).
        Some institutions use reverse grading scales.
        
        Args:
            account_id: Student account ID
            
        Returns:
            List of updated CompareResultTOR instances
        """
        if not account_id:
            raise ValidationException("Account ID is required")
        
        entries = CompareResultTOR.objects.filter(account_id=account_id)
        
        if not entries.exists():
            raise ResourceNotFoundException("TOR entries", account_id)
        
        cit_entries = CitTorContent.objects.filter(is_active=True)
        updated_entries = []
        
        for entry in entries:
            # Apply reverse grading
            if CurriculumService.STANDARD_FAILING_MIN <= entry.final_grade <= CurriculumService.STANDARD_FAILING_MAX:
                entry.remarks = "PASSED"
            elif CurriculumService.STANDARD_PASSING_MIN <= entry.final_grade <= CurriculumService.STANDARD_PASSING_MAX:
                entry.remarks = "FAILED"
            else:
                entry.remarks = "INVALID GRADE"
            
            # Generate summary
            entry.summary = CurriculumService.generate_summary(entry, cit_entries)
            updated_entries.append(entry)
        
        # Bulk update
        CompareResultTOR.objects.bulk_update(
            updated_entries,
            ['remarks', 'summary', 'updated_at'],
            batch_size=100
        )
        
        logger.info(
            f"Applied reverse grading for {len(updated_entries)} entries "
            f"for account: {account_id}"
        )
        
        return updated_entries
    
    @staticmethod
    @log_execution
    @atomic_transaction
    def copy_tor_entries(account_id: str) -> List[CompareResultTOR]:
        """
        Copy TOR entries from TorTransferee to CompareResultTOR.
        
        Args:
            account_id: Student account ID
            
        Returns:
            List of created CompareResultTOR instances
        """
        if not account_id:
            raise ValidationException("Account ID is required")
        
        # Import here to avoid circular dependency
        from torchecker.models import TorTransferee
        
        transferee_entries = TorTransferee.objects.filter(account_id=account_id)
        
        if not transferee_entries.exists():
            raise ResourceNotFoundException("Transferee TOR entries", account_id)
        
        compare_entries = []
        created_count = 0
        
        for entry in transferee_entries:
            compare_entry, created = CompareResultTOR.objects.get_or_create(
                account_id=entry.account_id,
                subject_code=entry.subject_code,
                defaults={
                    'subject_description': entry.subject_description,
                    'total_academic_units': entry.total_academic_units,
                    'final_grade': entry.final_grade,
                    'remarks': entry.remarks or '',
                    'summary': '',
                    'credit_evaluation': CompareResultTOR.CreditEvaluation.VOID
                }
            )
            
            # Add all entries (both new and existing)
            compare_entries.append(compare_entry)
            if created:
                created_count += 1
        
        logger.info(
            f"Copied {created_count} new TOR entries (total: {len(compare_entries)}) "
            f"for account: {account_id}"
        )
        
        return compare_entries
    
    @staticmethod
    @log_execution
    @atomic_transaction
    def sync_curriculum_matching(account_id: str) -> List[Dict]:
        """
        Sync and match TOR entries with CIT curriculum using similarity.
        
        Args:
            account_id: Student account ID
            
        Returns:
            List of dictionaries with matching results
        """
        if not account_id:
            raise ValidationException("Account ID is required")
        
        tor_entries = CompareResultTOR.objects.filter(account_id=account_id)
        
        if not tor_entries.exists():
            raise ResourceNotFoundException("TOR entries", account_id)
        
        cit_contents = CitTorContent.objects.filter(is_active=True)
        result_data = []
        updated_entries = []
        
        for tor in tor_entries:
            best_match = None
            best_accuracy = 0.0
            
            # Find best matching CIT subject
            for cit in cit_contents:
                combined_desc = " ".join(cit.description)
                accuracy = CurriculumService.calculate_similarity(
                    tor.subject_description,
                    combined_desc
                )
                
                if accuracy > best_accuracy:
                    best_accuracy = accuracy
                    best_match = cit
            
            # Generate summary based on match quality
            if best_accuracy >= CurriculumService.SIMILARITY_THRESHOLD:
                tor.summary = (
                    f"✓ Match Found\n"
                    f"CIT Subject: {best_match.subject_code}\n"
                    f"Similarity: {int(best_accuracy)}%\n"
                    f"Units: Student={int(tor.total_academic_units)}, CIT={best_match.units}"
                )
                
                # Auto-suggest evaluation based on similarity
                if best_accuracy >= 80 and tor.is_passing_grade:
                    tor.credit_evaluation = CompareResultTOR.CreditEvaluation.ACCEPTED
                elif best_accuracy >= 50:
                    tor.credit_evaluation = CompareResultTOR.CreditEvaluation.VOID
                else:
                    tor.credit_evaluation = CompareResultTOR.CreditEvaluation.DENIED
            else:
                tor.summary = (
                    f"✗ No Match Found\n"
                    f"Description similarity below {CurriculumService.SIMILARITY_THRESHOLD}% threshold\n"
                    f"Best match: {best_match.subject_code if best_match else 'None'} "
                    f"({int(best_accuracy)}%)"
                )
                tor.credit_evaluation = CompareResultTOR.CreditEvaluation.INVESTIGATE
            
            # Add to bulk update list instead of saving individually
            updated_entries.append(tor)
            
            result_data.append({
                "subject_code": tor.subject_code,
                "subject_description": tor.subject_description,
                "total_academic_units": tor.total_academic_units,
                "final_grade": tor.final_grade,
                "remarks": tor.remarks,
                "summary": tor.summary,
                "credit_evaluation": tor.credit_evaluation,
                "match_accuracy": int(best_accuracy) if best_match else 0,
                "matched_subject": best_match.subject_code if best_match else None
            })
        
        # Bulk update all entries at once (preserves data)
        CompareResultTOR.objects.bulk_update(
            updated_entries,
            ['summary', 'credit_evaluation', 'updated_at'],
            batch_size=100
        )
        
        logger.info(
            f"Synced {len(result_data)} entries with curriculum matching "
            f"for account: {account_id}"
        )
        
        return result_data
    
    @staticmethod
    @log_execution
    def update_credit_evaluation(
        entry_id: int,
        evaluation: str,
        notes: Optional[str] = None
    ) -> CompareResultTOR:
        """
        Update credit evaluation status for an entry.
        
        Args:
            entry_id: CompareResultTOR ID
            evaluation: New evaluation status
            notes: Optional notes
            
        Returns:
            Updated CompareResultTOR instance
        """
        try:
            entry = CompareResultTOR.objects.get(id=entry_id)
        except CompareResultTOR.DoesNotExist:
            raise ResourceNotFoundException("CompareResultTOR", str(entry_id))
        
        # Validate evaluation
        valid_evaluations = [choice.value for choice in CompareResultTOR.CreditEvaluation]
        if evaluation not in valid_evaluations:
            raise ValidationException(
                f"Invalid evaluation. Must be one of: {', '.join(valid_evaluations)}"
            )
        
        entry.credit_evaluation = evaluation
        
        if notes is not None:
            entry.notes = notes
        
        entry.save(update_fields=['credit_evaluation', 'notes', 'updated_at'])
        
        logger.info(
            f"Updated credit evaluation to '{evaluation}' "
            f"for entry ID: {entry_id}"
        )
        
        return entry
    
    @staticmethod
    @log_execution
    @atomic_transaction
    def update_tor_results(
        account_id: str,
        failed_subjects: List[str],
        passed_subjects: List[Dict[str, str]]
    ) -> Dict[str, int]:
        """
        Update TOR results by deleting failed subjects and updating passed ones.
        
        Args:
            account_id: Student account ID
            failed_subjects: List of subject codes to delete
            passed_subjects: List of dicts with subject_code and remarks
            
        Returns:
            Dictionary with counts of deleted and updated entries
        """
        if not account_id:
            raise ValidationException("Account ID is required")
        
        # Delete failed subjects
        deleted_count, _ = CompareResultTOR.objects.filter(
            account_id=account_id,
            subject_code__in=failed_subjects
        ).delete()
        
        # Update passed subjects
        updated_count = 0
        for subject in passed_subjects:
            updated = CompareResultTOR.objects.filter(
                account_id=account_id,
                subject_code=subject["subject_code"]
            ).update(
                remarks=subject["remarks"],
                updated_at=models.F('updated_at')
            )
            updated_count += updated
        
        logger.info(
            f"Updated TOR results for {account_id}: "
            f"{deleted_count} deleted, {updated_count} updated"
        )
        
        return {
            "deleted": deleted_count,
            "updated": updated_count
        }
    
    @staticmethod
    def get_comparison_statistics(account_id: str) -> Dict[str, int]:
        """
        Get statistics for TOR comparison results.
        
        Args:
            account_id: Student account ID
            
        Returns:
            Dictionary with statistics
        """
        from django.db.models import Count, Avg
        
        entries = CompareResultTOR.objects.filter(account_id=account_id)
        
        stats = {
            'total': entries.count(),
            'accepted': entries.filter(
                credit_evaluation=CompareResultTOR.CreditEvaluation.ACCEPTED
            ).count(),
            'denied': entries.filter(
                credit_evaluation=CompareResultTOR.CreditEvaluation.DENIED
            ).count(),
            'void': entries.filter(
                credit_evaluation=CompareResultTOR.CreditEvaluation.VOID
            ).count(),
            'passed': entries.filter(remarks='PASSED').count(),
            'failed': entries.filter(remarks='FAILED').count(),
        }
        
        # Calculate average grade
        avg_grade = entries.aggregate(Avg('final_grade'))['final_grade__avg']
        stats['average_grade'] = round(avg_grade, 2) if avg_grade else 0.0
        
        # Calculate total units
        total_units = sum(entry.total_academic_units for entry in entries)
        stats['total_units'] = total_units
        
        return stats
    
    @staticmethod
    def get_tracker_accreditation(account_id: str) -> List[Dict]:
        """
        Get accreditation tracking data for a student.
        
        Args:
            account_id: Student account ID
            
        Returns:
            List of subject tracking data
        """
        results = CompareResultTOR.objects.filter(
            account_id=account_id
        ).values(
            'account_id',
            'subject_code',
            'subject_description',
            'credit_evaluation'
        )
        
        return list(results)