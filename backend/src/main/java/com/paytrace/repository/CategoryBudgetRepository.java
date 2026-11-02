package com.paytrace.repository;

import com.paytrace.model.CategoryBudget;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryBudgetRepository extends MongoRepository<CategoryBudget, String> {

    Optional<CategoryBudget> findByCategoryAndYearAndMonth(String category, Integer year, Integer month);

    List<CategoryBudget> findByYearAndMonth(Integer year, Integer month);

    List<CategoryBudget> findByCategory(String category);

    List<CategoryBudget> findByCategoryAndApplyToUpcomingTrue(String category);

    Optional<CategoryBudget> findFirstByCategoryAndYearIsNull(String category);

    void deleteByCategoryAndYearAndMonth(String category, Integer year, Integer month);

    void deleteByCategory(String category);
}

